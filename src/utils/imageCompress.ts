// src/utils/imageCompress.ts

export const compressImage = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7,
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;

      // FileReader.readAsDataURL 的 result 通常是 string，但类型上可能是 string | ArrayBuffer | null
      if (typeof result !== "string") {
        reject(new Error("Failed to read file as data URL."));
        return;
      }

      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context is not supported."));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error("Image failed to load."));
      img.src = result;
    };

    reader.onerror = () => reject(new Error("FileReader failed."));
    reader.readAsDataURL(file);
  });
};
