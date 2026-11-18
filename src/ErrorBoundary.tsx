import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface S { error: Error | null }

/** Shows a readable message if the 3D scene (WebGL / Rapier WASM) fails to start. */
export class ErrorBoundary extends Component<Props, S> {
  state: S = { error: null }
  static getDerivedStateFromError(error: Error): S {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="fatal" role="alert">
        <h1>3D core failed to start</h1>
        <p>{this.state.error.message}</p>
        <p>UNIVERSE.EXE needs a browser with WebGL and WebAssembly enabled. Try reloading or enabling hardware acceleration.</p>
        <button className="btn accent" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
