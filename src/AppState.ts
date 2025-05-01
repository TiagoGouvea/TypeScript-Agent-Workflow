class AppState {
  private static instance: AppState;
  private state: any = {};

  private constructor() {}

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

  public set(key: string, value: any): void {
    this.state[key] = value;
  }

  public get(key: string): any {
    return this.state[key];
  }
}

export default AppState.getInstance();
