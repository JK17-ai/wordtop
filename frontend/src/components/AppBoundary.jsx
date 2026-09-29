import {Component} from 'react';
export default class AppBoundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="profile-screen"><h1>화면을 다시 열어 주세요</h1><p>화면을 표시하지 못했어요. 저장된 학습 기록은 삭제하지 않았습니다.</p><button onClick={() => location.reload()}>다시 열기</button></main>;
  }
}
