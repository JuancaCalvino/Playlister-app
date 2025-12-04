import { LOGIN_URL } from "@/lib/spotify";
import LandingClient from "./LandingClient";

export default function Home() {
  return <LandingClient loginUrl={LOGIN_URL} />;
}
