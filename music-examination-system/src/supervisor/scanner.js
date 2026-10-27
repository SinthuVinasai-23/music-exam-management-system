import jsQR from "jsqr";

export function decodeFrame(imageData) {
  return (
    jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    })?.data || null
  );
}

export async function startScanner(video, { signal, onCode, onError }) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error(
      "Camera access is unavailable. Open this app on localhost or HTTPS, or enter the code manually.",
    );
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });
  let timer;
  const stop = () => {
    clearTimeout(timer);
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
    signal.removeEventListener("abort", stop);
  };
  if (signal.aborted) {
    stop();
    return;
  }
  signal.addEventListener("abort", stop, { once: true });
  try {
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error(
        "Camera image processing is unavailable. Enter the code manually.",
      );
    const read = () => {
      if (signal.aborted) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          canvas.width = Math.min(640, video.videoWidth);
          canvas.height = Math.round(
            (video.videoHeight * canvas.width) / video.videoWidth,
          );
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const code = decodeFrame(
            context.getImageData(0, 0, canvas.width, canvas.height),
          );
          if (code) {
            stop();
            onCode(code);
            return;
          }
        }
        timer = setTimeout(read, 250);
      } catch (error) {
        stop();
        onError(error);
      }
    };
    read();
  } catch (error) {
    stop();
    throw error;
  }
}
