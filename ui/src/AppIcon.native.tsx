import Svg, { Path } from "react-native-svg";
import type { AppIconProps } from "./AppIcon.types";
import { iconPaths } from "./iconPaths";

export function AppIcon({
  color = "currentColor",
  name,
  size = 20,
  testID,
}: AppIconProps) {
  return (
    <Svg
      accessibilityElementsHidden
      accessible={false}
      fill="none"
      height={size}
      importantForAccessibility="no"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name].map((path, index) => (
        <Path d={path} key={`${name}-${index}`} />
      ))}
    </Svg>
  );
}
