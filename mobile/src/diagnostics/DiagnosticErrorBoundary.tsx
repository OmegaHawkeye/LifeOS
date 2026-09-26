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
        <View className="flex-1 items-center justify-center gap-4 bg-lifeos-background p-6">
          <Text className="text-center text-xl font-bold text-lifeos-primary">
            LifeOS hit a problem
          </Text>
          <Text className="text-center text-sm text-lifeos-muted">
            A privacy-safe diagnostic was saved on this device. Close and reopen
            LifeOS to try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-11 justify-center rounded-xl bg-lifeos-accent px-4"
            onPress={() => this.setState({ hasError: false })}
          >
            <Text className="text-center font-semibold text-lifeos-accent-ink">
              Try again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
