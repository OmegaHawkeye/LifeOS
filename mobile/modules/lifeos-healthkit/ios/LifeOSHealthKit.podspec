require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'LifeOSHealthKit'
  s.version = package['version']
  s.summary = 'Read-only Apple HealthKit bridge for LifeOS'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'LifeOS'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.frameworks = 'HealthKit'
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
