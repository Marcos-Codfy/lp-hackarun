import { describe, expect, it } from 'vitest';
import { fail, ok, TeamImage, type Result } from '@domain/index';
import { RegistrationGatewayError, type PreparedTeamImageDTO } from '@application/index';
import { fakeImageBase64, preparedImage } from '../../helpers/images';
import { fillValidTeam, setupForm } from './formSetup';

const FILE = { type: 'image/png', size: 2048 };
type Prepared = Result<PreparedTeamImageDTO, string>;

// promessa que o teste resolve na mão (processamento "lento")
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('RegistrationFormViewModel · foto ou logo da equipe', () => {
  it('arquivo aceito: status pronto, sem erro, e a imagem vai no envio', async () => {
    const { vm, gateway } = setupForm();
    fillValidTeam(vm);
    await vm.chooseTeamImage(FILE);
    expect(vm.state.value.imageStatus).toBe('ready');
    expect(vm.state.value.errors['teamImage']).toBeUndefined();
    await vm.submit();
    expect(gateway.calls[0]?.teamImage).toEqual({ mimeType: 'image/webp', base64: preparedImage().base64 });
  });

  it('arquivo recusado: o motivo vira o erro do campo e a imagem anterior sai', async () => {
    const { vm } = setupForm({
      prepare: async () => fail('A imagem passa de 10 MB. Escolha uma mais leve.'),
    });
    vm.setTeamImage(preparedImage());
    await vm.chooseTeamImage(FILE);
    expect(vm.state.value).toMatchObject({ imageStatus: 'invalid', fields: { teamImage: null } });
    expect(vm.state.value.errors['teamImage']).toBe('A imagem passa de 10 MB. Escolha uma mais leve.');
  });

  it('erro inesperado no preparo vira mensagem amigável', async () => {
    const { vm } = setupForm({ prepare: () => Promise.reject(new Error('boom')) });
    await vm.chooseTeamImage(FILE);
    expect(vm.state.value.errors['teamImage']).toMatch(/Não deu pra preparar a imagem/);
  });

  it('trocou de arquivo no meio do preparo: vale o último', async () => {
    const slow = deferred<Prepared>();
    let calls = 0;
    const { vm } = setupForm({
      prepare: () => (++calls === 1 ? slow.promise : Promise.resolve(ok(preparedImage({ width: 321 })))),
    });
    const first = vm.chooseTeamImage(FILE);
    expect(vm.state.value.imageStatus).toBe('processing');
    await vm.chooseTeamImage(FILE);
    slow.resolve(ok(preparedImage({ width: 999 })));
    await first;
    expect(vm.fields.teamImage?.width).toBe(321);
    expect(vm.state.value.imageStatus).toBe('ready');
  });

  it('enviar com a foto ainda preparando espera ela em vez de acusar "falta a foto"', async () => {
    const slow = deferred<Prepared>();
    const { vm, gateway } = setupForm({ prepare: () => slow.promise });
    fillValidTeam(vm);
    void vm.chooseTeamImage(FILE);
    const sending = vm.submit();
    slow.resolve(ok(preparedImage({ base64: preparedImage().base64 })));
    await sending;
    expect(vm.state.value.status).toBe('success');
    expect(gateway.calls).toHaveLength(1);
  });

  it('primeira foto preparando: nada de "envie uma foto" enquanto o spinner gira', async () => {
    const slow = deferred<Prepared>();
    const { vm } = setupForm({ prepare: () => slow.promise });
    const run = vm.chooseTeamImage(FILE);
    expect(vm.state.value.imageStatus).toBe('processing');
    expect(vm.state.value.errors['teamImage']).toBeUndefined();
    vm.blur('teamName');
    expect(vm.state.value.errors['teamImage']).toBeUndefined();
    slow.resolve(fail('A imagem passa de 10 MB. Escolha uma mais leve.'));
    await run;
    expect(vm.state.value.errors['teamImage']).toBe('A imagem passa de 10 MB. Escolha uma mais leve.');
  });

  it('trocou de arquivo com o envio esperando: manda a imagem nova, não a do meio', async () => {
    const first = deferred<Prepared>();
    const second = deferred<Prepared>();
    const queue = [first.promise, second.promise];
    const { vm, gateway } = setupForm({ prepare: () => queue.shift() ?? Promise.reject(new Error('extra')) });
    fillValidTeam(vm);
    void vm.chooseTeamImage(FILE);
    const sending = vm.submit();
    const swap = vm.chooseTeamImage(FILE);
    first.resolve(ok(preparedImage({ width: 111 })));
    await Promise.resolve();
    expect(gateway.calls).toHaveLength(0);
    const png = preparedImage({ mimeType: 'image/png', base64: fakeImageBase64('image/png'), width: 222 });
    second.resolve(ok(png));
    await swap;
    await sending;
    expect(vm.state.value.status).toBe('success');
    expect(gateway.calls).toHaveLength(1);
    expect(gateway.calls[0]?.teamImage).toEqual({ mimeType: 'image/png', base64: png.base64 });
  });

  it('sem foto, o envio aponta o campo logo depois do nome da equipe', async () => {
    const { vm } = setupForm();
    vm.setText('teamName', 'Bug Busters');
    await vm.submit();
    expect(vm.state.value.errors['teamImage']).toBe(TeamImage.MISSING);
    expect(vm.state.value.orderedErrors.map((e) => e.path).slice(0, 2)).toEqual(['teamImage', 'leader.name']);
  });

  it('o "Tentar de novo" reenvia a mesma imagem com a mesma chave, sem preparar de novo', async () => {
    const { vm, gateway, prepareImage } = setupForm();
    fillValidTeam(vm);
    await vm.chooseTeamImage(FILE);
    gateway.willThrow(new RegistrationGatewayError('network', 'x'));
    await vm.submit();
    await vm.retry();
    const [first, second] = gateway.calls;
    expect(second?.teamImage).toEqual(first?.teamImage);
    expect(second?.idempotencyKey).toBe(first?.idempotencyKey);
    expect(prepareImage.execute).toHaveBeenCalledTimes(1);
  });

  it('inscrição individual não pede foto', async () => {
    const { vm, gateway } = setupForm();
    fillValidTeam(vm);
    vm.setMode('solo');
    await vm.chooseTeamImage(FILE).catch(() => {});
    await vm.submit();
    expect(gateway.calls[0]?.teamImage).toBeNull();
  });
});
