import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";

export default async function ChatPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("spotify_access_token");

    // Await searchParams as it is a Promise in Next.js 15+ (and likely 16)
    const params = await searchParams;
    const urlToken = params?.token;

    // If no token in cookies AND no token in URL, redirect to landing with error
    if (!token && !urlToken) {
        redirect("/?error=session_expired");
    }

    return <ChatClient />;
}
