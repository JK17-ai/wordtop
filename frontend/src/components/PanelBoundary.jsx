import { Component } from 'react';
export default class PanelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section className="learning-panel" role="alert"><p>이 화면을 불러오지 못했어요. 학습 기록은 그대로 유지됩니다.</p><button className="back-to-study" onClick={this.props.onClose}><span aria-hidden="true">← </span>학습으로</button><button onClick={() => this.setState({failed:false})}>다시 시도</button></section>;
    return this.props.children;
  }
}
