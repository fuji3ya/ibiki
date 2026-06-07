Pod::Spec.new do |s|
  s.name           = 'IbikiSound'
  s.version        = '1.0.0'
  s.summary        = 'On-device sleep-sound classification (SoundAnalysis) for いびき'
  s.description    = 'Runs SNAudioFileAnalyzer + SNClassifySoundRequest(.version1) fully on device, no network.'
  s.author         = 'Starving Effort'
  s.homepage       = 'https://docs.expo.dev/modules/'
  # Must be <= the app's iOS deployment target, or Expo autolinking SILENTLY skips
  # this module and requireNativeModule('IbikiSound') throws at launch → RCTFatal.
  # SoundAnalysis built-in classifier (version1) ships from iOS 15.0; all 15+ APIs
  # are guarded with @available / if #available so a 15.1 deployment target is safe
  # (isSupported() returns false below iOS 15).
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
