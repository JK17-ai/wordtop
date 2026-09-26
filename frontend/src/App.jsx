import FileUpload from "./components/FileUpload";
import ProfileGate from "./components/ProfileGate";

export default function App() {
  return <ProfileGate>{profile => <FileUpload key={profile.id} profile={profile} />}</ProfileGate>;
}
