export const chunkText =
  (
    text: string,
    chunkSize = 1000,
    overlap = 200
  ) => {

    const chunks: string[] = [];

    let start = 0;

    while (start < text.length) {

      const end =
        start + chunkSize;

      const chunk =
        text.slice(start, end);

      chunks.push(chunk);

      start +=
        chunkSize - overlap;
    }

    return chunks;
};