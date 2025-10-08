export class UrlQueueModule {
  private static queue: string[] = [];

  static enqueueUrl(url: string) {
    this.queue.push(url);
  }

  static dequeueUrl() {
    const item = this.queue.shift();
    return item || null;
  }

  static async size() {
    return this.queue.length;
  }

  static isEmpty() {
    return this.queue.length === 0;
  }

  static contains(url: string) {
    return this.queue.some((item) => item === url);
  }

  static clear() {
    this.queue = [];
  }
}
