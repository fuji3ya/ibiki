import { requireNativeModule } from 'expo';
import type { RawClassifyResult } from './IbikiSound.types';

// ネイティブモジュールを防御的にロードする。autolinking が IbikiSound を含まない
// 状態で requireNativeModule すると import 時に throw → release ビルドでは未捕捉例外
// → RCTFatal → 起動クラッシュ（red screen 無し）になる。ここで握って "unsupported"
// に落とすことで、クラッシュさせず実状態を観測できるようにする（うちのモん同様）。
type IbikiSoundNative = {
  isSupported(): boolean;
  classifyFile(uri: string): Promise<RawClassifyResult[]>;
  __loadError?: string;
};

let nativeModule: IbikiSoundNative;
try {
  nativeModule = requireNativeModule<IbikiSoundNative>('IbikiSound');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  nativeModule = {
    isSupported: () => false,
    classifyFile: async () => {
      throw new Error('IbikiSound native module is not linked: ' + msg);
    },
    __loadError: msg,
  };
}

export default nativeModule;
