export interface ConfirmDialogAction {
  icon: string;
  iconRight?: boolean;
  label: string;
  color: string;
  action: () => void | Promise<void>;
}

export interface ConfirmDialogOption {
  width?: number;
  message?: string;
  actions?: ConfirmDialogAction[];
}

export class ConfirmDialog {
  static show(_option: ConfirmDialogOption): void {}

  static close(): void {}
}
