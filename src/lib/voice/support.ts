export type VoiceSupport = {
  speechSynthesis: boolean;
  speechRecognition: boolean;
  label: string;
};

export function voiceSupport(target: { speechSynthesis?: unknown; SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown } | null): VoiceSupport {
  if (!target) {
    return {
      speechSynthesis: false,
      speechRecognition: false,
      label: "Voice is checked in the browser after the page loads.",
    };
  }
  const speechSynthesis = "speechSynthesis" in target && Boolean(target.speechSynthesis);
  const speechRecognition = Boolean(target.SpeechRecognition || target.webkitSpeechRecognition);
  if (speechSynthesis && speechRecognition) {
    return {
      speechSynthesis,
      speechRecognition,
      label: "This browser can speak questions and transcribe the microphone.",
    };
  }
  if (!speechSynthesis && !speechRecognition) {
    return {
      speechSynthesis,
      speechRecognition,
      label: "This browser does not expose speech synthesis or speech recognition. Type the answer instead.",
    };
  }
  if (!speechRecognition) {
    return {
      speechSynthesis,
      speechRecognition,
      label: "This browser can speak the question, but it has no speech recognition. Type the answer.",
    };
  }
  return {
    speechSynthesis,
    speechRecognition,
    label: "This browser can transcribe speech, but it cannot speak the question.",
  };
}
