import Svg, { Path } from "react-native-svg";

type GoogleIconProps = {
  size?: number;
};

export function GoogleIcon({ size = 20 }: GoogleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M43.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11c-.5 2.7-2 5-4.3 6.5v5.5h7c4-3.7 5.9-9.2 5.9-16z"
      />
      <Path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-7-5.5c-1.9 1.3-4 2-6.5 2-5 0-9.3-3.4-10.8-8H6v5.7C9.4 39.7 16.2 44 24 44z"
      />
      <Path
        fill="#FBBC05"
        d="M13.2 27.6a12 12 0 0 1 0-7.2v-5.7H6a20 20 0 0 0 0 18.6l7.2-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.9 29.5 4 24 4 16.2 4 9.4 8.3 6 14.7l7.2 5.7c1.5-4.6 5.8-8.4 10.8-8.4z"
      />
    </Svg>
  );
}
