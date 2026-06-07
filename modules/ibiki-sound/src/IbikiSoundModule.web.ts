import { registerWebModule, NativeModule } from 'expo';

// Web には端末内 SoundAnalysis が無い。いびきは iOS 専用なので、web bundling を
// 生かすためのスタブ（isSupported:false / classifyFile は空配列）。
class IbikiSoundModule extends NativeModule<{}> {
  isSupported(): boolean {
    return false;
  }

  async classifyFile(_uri: string): Promise<unknown[]> {
    return [];
  }
}

export default registerWebModule(IbikiSoundModule, 'IbikiSoundModule');
