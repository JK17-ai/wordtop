import FileUpload from "./components/FileUpload";
import ProfileGate from "./components/ProfileGate";
import { useEffect } from "react";
import { installSoundUnlock } from "./reactionSound";

export default function App() {
  useEffect(() => installSoundUnlock(), []);
  return <ProfileGate>{profile => <FileUpload key={profile.id} profile={profile} />}</ProfileGate>;
}
