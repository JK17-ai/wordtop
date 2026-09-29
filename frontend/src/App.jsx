import LaunchGate from './components/LaunchGate';
import FileUpload from "./components/FileUpload";
import ProfileGate from "./components/ProfileGate";
import { useEffect } from "react";
import { installSoundUnlock } from "./reactionSound";

export default function App() {
  useEffect(() => installSoundUnlock(), []);
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'onboarding') return <ProfileGate preview/>;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'learning') return <ProfileGate>{profile => <FileUpload key={profile.id} profile={profile} />}</ProfileGate>;
  return <LaunchGate><ProfileGate>{profile => <FileUpload key={profile.id} profile={profile} />}</ProfileGate></LaunchGate>;
}
