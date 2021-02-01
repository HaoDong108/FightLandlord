namespace Audios {
  enum Man {
    报警一张 = "..audioman\baojing1.ogg",
    报警两张 = "..audioman\baojing2.ogg",
  }

  function play(src: string): void {
    var a = new Audio(src);
    a.play();
  }
}
