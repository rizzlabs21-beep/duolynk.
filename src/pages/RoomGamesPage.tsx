import { Navigate, useParams } from 'react-router-dom';

/**
 * Games now live inside the room page: the selected game takes the main area
 * and the chat moves into the side panel. This route is kept only so older
 * links keep working.
 */
export default function RoomGamesPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <Navigate to={roomId ? `/app/rooms/${roomId}` : '/app'} replace />;
}
