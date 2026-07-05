import { usePathname, useRouter } from 'expo-router';
import { type ReactNode, useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const TAB_ROUTES = ['/', '/explore', '/profile'] as const;

type TabRoute = (typeof TAB_ROUTES)[number];

function routeFromPath(pathname: string): TabRoute {
  if (pathname.startsWith('/profile')) return '/profile';
  if (pathname.startsWith('/explore')) return '/explore';
  return '/';
}

export function SwipeTabNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = routeFromPath(pathname);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-70, 70])
        .failOffsetY([-35, 35])
        .onEnd((event) => {
          const currentIndex = TAB_ROUTES.indexOf(activeRoute);
          const nextIndex = event.translationX < 0 ? currentIndex + 1 : currentIndex - 1;
          const nextRoute = TAB_ROUTES[nextIndex];

          if (!nextRoute) return;
          runOnJS(router.replace)(nextRoute);
        }),
    [activeRoute, router],
  );

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
