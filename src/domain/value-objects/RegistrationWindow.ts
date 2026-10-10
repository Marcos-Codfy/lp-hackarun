import { ValueObject } from '../shared/ValueObject';
import type { Slots } from './Slots';
import type { TeamSizeRule } from '../entities/TeamRegistration';

interface RegistrationWindowProps {
  endpoint: string | null;
  closesAt: Date | null;
  slots: Slots;
  teamSize: TeamSizeRule;
}

// endpoint = Web App do Apps Script que grava na planilha; null = inscrições ainda fechadas
export class RegistrationWindow extends ValueObject<RegistrationWindowProps> {
  static create(props: RegistrationWindowProps): RegistrationWindow {
    return new RegistrationWindow({ ...props, endpoint: props.endpoint?.trim() || null });
  }

  get endpoint(): string | null {
    return this.props.endpoint;
  }

  get closesAt(): Date | null {
    return this.props.closesAt;
  }

  get slots(): Slots {
    return this.props.slots;
  }

  get teamSize(): TeamSizeRule {
    return this.props.teamSize;
  }

  withSlots(slots: Slots): RegistrationWindow {
    return new RegistrationWindow({ ...this.props, slots });
  }

  withEndpoint(endpoint: string | null): RegistrationWindow {
    return RegistrationWindow.create({ ...this.props, endpoint });
  }
}
