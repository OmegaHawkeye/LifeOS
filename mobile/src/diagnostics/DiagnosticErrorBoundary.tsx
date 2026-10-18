import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { captureUnhandledError } from "./localDiagnostics";

type DiagnosticErrorBoundaryProps = {
  children: ReactNode;
};

type DiagnosticErrorBoundaryState = {
  hasError: boolean;
};

export class DiagnosticErrorBoundary extends Component<
  DiagnosticErrorBoundaryProps,
  DiagnosticErrorBoundaryState
> {
  state: DiagnosticErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DiagnosticErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    captureUnhandledError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-canvas p-6">
          <Text className="text-center text-title-l font-semibold text-ink">
            LifeOS hit a problem
          </Text>
          <Text className="text-center text-body-s text-ink-muted">
            A privacy-safe diagnostic was saved on this device. Close and reopen
            LifeOS to try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-11 justify-center rounded-sm bg-primary px-4"
            onPress={() => this.setState({ hasError: false })}
          >
            <Text className="text-center font-semibold text-on-primary">
              Try again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
