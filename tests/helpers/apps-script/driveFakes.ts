// dublês do DriveApp e dos blobs do Utilities: só o que o Images.gs usa

export interface FakeBlob {
  bytes: number[];
  contentType: string;
  name: string;
}

export class FakeDriveFile {
  trashed = false;
  sharing: [string, string] | null = null;

  constructor(
    readonly id: string,
    readonly blob: FakeBlob,
    private readonly drive: FakeDrive,
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.blob.name;
  }

  setSharing(access: string, permission: string): this {
    this.drive.onShare?.();
    // domínio institucional que proíbe "qualquer pessoa com o link"
    if (this.drive.blockSharing) throw new Error('Sharing is restricted by the domain administrator');
    this.sharing = [access, permission];
    return this;
  }

  setTrashed(trashed: boolean): this {
    this.trashed = trashed;
    return this;
  }
}

export class FakeFolder {
  readonly files: FakeDriveFile[] = [];

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly drive: FakeDrive,
  ) {}

  getId(): string {
    return this.id;
  }

  getUrl(): string {
    return `https://drive.google.com/drive/folders/${this.id}`;
  }

  createFile(blob: FakeBlob): FakeDriveFile {
    if (this.drive.failCreate) throw new Error('Drive quota exceeded');
    const file = new FakeDriveFile(this.drive.nextId('file'), blob, this.drive);
    this.files.push(file);
    this.drive.files.set(file.id, file);
    return file;
  }
}

export class FakeDrive {
  readonly folders = new Map<string, FakeFolder>();
  readonly files = new Map<string, FakeDriveFile>();
  blockSharing = false;
  failCreate = false;
  // espião do momento em que o link público é ligado (ex.: o lock já foi solto?)
  onShare: (() => void) | null = null;
  private seq = 0;

  // ids com cara de Drive (letras, números, _ e -, 20+ caracteres)
  nextId(kind: 'file' | 'folder'): string {
    return `${kind}_${String(++this.seq).padStart(4, '0')}_AbCdEfGhIjKlMnOp`;
  }

  get allFiles(): FakeDriveFile[] {
    return [...this.files.values()];
  }

  // o objeto global DriveApp que o script enxerga
  api(): Record<string, unknown> {
    return {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      createFolder: (name: string) => {
        const folder = new FakeFolder(this.nextId('folder'), name, this);
        this.folders.set(folder.id, folder);
        return folder;
      },
      getFolderById: (id: string) => {
        const folder = this.folders.get(id);
        if (!folder) throw new Error('No item with the given ID could be found');
        return folder;
      },
      getFileById: (id: string) => {
        const file = this.files.get(id);
        if (!file) throw new Error('No item with the given ID could be found');
        return file;
      },
    };
  }
}

// Utilities.base64Decode devolve bytes com sinal (-128..127), como no Java
export function signedBytes(base64: string): number[] {
  return Array.from(Buffer.from(base64, 'base64'), (b) => (b > 127 ? b - 256 : b));
}
