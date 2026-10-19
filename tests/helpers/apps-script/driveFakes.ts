// dublê do DriveApp: só o que o Images.gs usa (a pasta das insígnias)

export class FakeFolder {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {}

  getId(): string {
    return this.id;
  }

  getUrl(): string {
    return `https://drive.google.com/drive/folders/${this.id}`;
  }
}

export class FakeDrive {
  readonly folders = new Map<string, FakeFolder>();
  private seq = 0;

  // ids com cara de Drive (letras, números, _ e -, 20+ caracteres)
  nextId(): string {
    return `folder_${String(++this.seq).padStart(4, '0')}_AbCdEfGhIjKlMnOp`;
  }

  createFolder(name: string): FakeFolder {
    const folder = new FakeFolder(this.nextId(), name);
    this.folders.set(folder.id, folder);
    return folder;
  }

  // o objeto global DriveApp que o script enxerga
  api(): Record<string, unknown> {
    return {
      createFolder: (name: string) => this.createFolder(name),
      getFolderById: (id: string) => {
        const folder = this.folders.get(id);
        if (!folder) throw new Error('No item with the given ID could be found');
        return folder;
      },
    };
  }
}
