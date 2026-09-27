import type { ReactNode } from "react";
import { Component } from "react";
import { Button } from "@/components/Button";

type State = { failed: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fatal">
        <div className="fatal__panel">
          <h1>This screen could not be displayed</h1>
          <p>Reload the workspace and try the action again.</p>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
