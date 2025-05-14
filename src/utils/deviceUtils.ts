// device validator
import { DeviceActions } from '../types/deviceTypes'

export class DeviceActionValidator {
  private static validActions = new Set(Object.values(DeviceActions));

  public static isValid(action: string): action is DeviceActions {
    return this.validActions.has(action as DeviceActions);
  }

  public static validate(action: string): void {
    if (!this.isValid(action)) {
      console.log("here1")
      throw new Error(`Invalid device action: ${action}`);
    }
  }
}