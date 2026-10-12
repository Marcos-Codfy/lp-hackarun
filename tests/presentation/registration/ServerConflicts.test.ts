import { describe, expect, it } from 'vitest';
import { RegistrationGatewayError } from '@application/index';
import { fillMember, fillValidTeam, setupForm as setup } from './formSetup';

describe('RegistrationFormViewModel · já inscrito em outra equipe', () => {
  it('nome repetido: o erro fica no campo até a pessoa trocar o nome', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    gateway.willThrow(new RegistrationGatewayError('duplicate-team-name', 'x'));
    await vm.submit();
    expect(vm.state.value).toMatchObject({ status: 'idle', failure: null, focus: { path: 'teamName' } });
    expect(vm.state.value.errors['teamName']).toBe('Esse nome já é de outra equipe inscrita. Escolha outro.');
    vm.setText('members.1.name', 'Bruno Lima Duarte');
    expect(vm.state.value.errors['teamName']).toBeDefined();
    vm.setText('teamName', 'Bug Busters 2');
    expect(vm.state.value.errors['teamName']).toBeUndefined();
    vm.setText('teamName', '  bug   BUSTERS ');
    expect(vm.state.value.errors['teamName']).toBeDefined();
  });

  it('e-mail e matrícula repetidos marcam o integrante certo, mesmo depois de remover outro card', async () => {
    const { vm, gateway } = setup();
    fillValidTeam(vm);
    vm.addMember();
    fillMember(vm, 2);
    gateway
      .willThrow(new RegistrationGatewayError('duplicate-email', 'x', [2]))
      .willThrow(new RegistrationGatewayError('duplicate-student-id', 'x', [0]));
    await vm.submit();
    expect(vm.state.value.errors['members.2.email']).toBe('Esse e-mail já está em outra equipe inscrita.');
    expect(vm.state.value.focus?.path).toBe('members.2.email');
    vm.setText('members.2.email', 'carla.dias@exemplo.com');
    await vm.submit();
    expect(vm.state.value.errors).toEqual({
      'members.0.studentId': 'Essa matrícula já está em outra equipe inscrita.',
    });
    vm.setText('members.2.email', 'carla@exemplo.com');
    vm.removeMember(1);
    expect(Object.keys(vm.state.value.errors).sort()).toEqual(['members.0.studentId', 'members.1.email']);
  });
});
