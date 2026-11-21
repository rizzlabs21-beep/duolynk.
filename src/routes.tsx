import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import JoinPage from './pages/JoinPage';
import DashboardPage from './pages/DashboardPage';
import CreateRoomPage from './pages/CreateRoomPage';
import RoomPage from './pages/RoomPage';
import RoomGamesPage from './pages/RoomGamesPage';
import SettingsPage from './pages/SettingsPage';
import LeaderboardPage from './pages/LeaderboardPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Home', path: '/', element: <LandingPage />, public: true },
  { name: 'Sign in', path: '/signin', element: <SignInPage />, public: true },
  { name: 'Create account', path: '/signup', element: <SignUpPage />, public: true },
  { name: 'Join a room', path: '/join', element: <JoinPage />, public: true },
  { name: 'Dashboard', path: '/app', element: <DashboardPage /> },
  { name: 'Create a room', path: '/app/rooms/new', element: <CreateRoomPage /> },
  { name: 'Room', path: '/app/rooms/:roomId', element: <RoomPage /> },
  { name: 'Room games', path: '/app/rooms/:roomId/games', element: <RoomGamesPage /> },
  { name: 'Leaderboard', path: '/app/leaderboard', element: <LeaderboardPage /> },
  { name: 'Settings', path: '/app/settings', element: <SettingsPage /> },
];
