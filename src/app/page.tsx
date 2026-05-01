"use client";

import { useState } from "react";
import { useGameAudio } from "@/hooks/use-game-audio";
import { useSpeech } from "@/hooks/use-speech";
import { IpadShell } from "@/components/game/ipad-shell";
import { HomeScreen } from "@/components/game/home-screen";
import { LessonScreen, type LetterCase } from "@/components/game/lesson-screen";
import { ListenScreen } from "@/components/game/listen-screen";
import { PlayScreen } from "@/components/game/play-screen";

type Screen = "home" | "lesson" | "listen" | "play";

interface Route {
  screen: Screen;
  index: number;
}

export default function Home() {
  const [route, setRoute] = useState<Route>({ screen: "home", index: 0 });
  // Letter case ships fixed to upper case for kids; design's tweaks panel is
  // dev-only and not surfaced in production.
  const [letterCase] = useState<LetterCase>("upper");

  const {
    isMusicPlaying,
    playStart,
    startBackgroundMusic,
    stopBackgroundMusic,
    toggleBackgroundMusic,
  } = useGameAudio();
  const { warmUp } = useSpeech();

  const goHome = () => {
    stopBackgroundMusic();
    setRoute({ screen: "home", index: 0 });
  };
  const goLesson = (index = 0) => {
    playStart();
    warmUp();
    startBackgroundMusic();
    setRoute({ screen: "lesson", index });
  };
  const goListen = () => {
    playStart();
    warmUp();
    startBackgroundMusic();
    setRoute({ screen: "listen", index: 0 });
  };
  const goPlay = () => {
    playStart();
    warmUp();
    startBackgroundMusic();
    setRoute({ screen: "play", index: 0 });
  };

  const onMode = (mode: "lesson" | "listen" | "play") => {
    if (mode === "lesson") goLesson(0);
    else if (mode === "listen") goListen();
    else goPlay();
  };

  return (
    <IpadShell>
      {route.screen === "home" ? (
        <HomeScreen onStart={() => goLesson(0)} onMode={onMode} />
      ) : null}
      {route.screen === "lesson" ? (
        <LessonScreen
          index={route.index}
          onIndex={(i) => setRoute((r) => ({ ...r, index: Math.max(0, Math.min(35, i)) }))}
          onHome={goHome}
          letterCase={letterCase}
          isMusicPlaying={isMusicPlaying}
          onToggleMusic={toggleBackgroundMusic}
        />
      ) : null}
      {route.screen === "listen" ? (
        <ListenScreen onHome={goHome} letterCase={letterCase} />
      ) : null}
      {route.screen === "play" ? (
        <PlayScreen onHome={goHome} letterCase={letterCase} />
      ) : null}
    </IpadShell>
  );
}
