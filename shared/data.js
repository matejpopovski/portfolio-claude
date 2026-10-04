/*
 * All site content lives here. Edit this file to update the portfolio;
 * nothing else needs to change.
 */
window.PORTFOLIO = {
  name: "Matej Popovski",
  first: "MATEJ",
  last: "POPOVSKI",
  role: "Computer Science · UW–Madison",
  location: "Madison, Wisconsin",

  // Rotating words in the hero ("Matej ___")
  verbs: [
    "teaches robots to find their way",
    "deals poker hands in Python",
    "races CPUs against GPUs",
    "guesses words in five letters",
    "builds things that feel good to use",
  ],

  about: [
    "I'm a computer science student who likes the moment code leaves the screen and starts doing something: a robot that maps a room, a card that slides across a table, a model that trains a third faster on the right silicon.",
    "I care about clean object-oriented design, honest benchmarks, and interfaces that feel smooth. Most of what I build starts as a course project and ends as something I actually want to play with.",
  ],

  facts: [
    { k: "Based in", v: "Madison, WI" },
    { k: "Studying", v: "Computer Science" },
    { k: "Into", v: "Robotics · ML · Games" },
    { k: "Currently", v: "Building with AI" },
  ],

  skills: [
    "Python", "Java", "PyTorch", "Pygame", "Swing", "ROS-style robotics",
    "SLAM", "Path Planning", "State Estimation", "Data Structures",
    "Algorithms", "JUnit 5", "Git", "Bash", "OOP", "Machine Learning",
  ],

  // Each project becomes a playing card. rank + suit are just for fun.
  projects: [
    {
      rank: "A", suit: "♠",
      title: "Poker Game",
      tag: "Python · Pygame",
      blurb: "A two-player poker table with animated card dealing and a click-to-play GUI. Two hole cards each, three community cards, best hand wins.",
      bullets: ["Object-oriented engine", "Animated dealing", "ctypes display scaling across platforms"],
      url: "https://github.com/matejpopovski/Poker-Game",
    },
    {
      rank: "K", suit: "♥",
      title: "Wordle",
      tag: "Java · Swing",
      blurb: "Wordle rebuilt in Java Swing: six guesses at a hidden five-letter word on a graphical grid, with clean event-driven code underneath.",
      bullets: ["Event-driven GUI", "File-based word lists", "Clean OOP structure"],
      url: "https://github.com/matejpopovski/Wordle-Game",
    },
    {
      rank: "Q", suit: "♦",
      title: "Autonomous Robotics",
      tag: "CS 639 · Robotics",
      blurb: "Robots that sense and act in messy, uncertain worlds: state estimation, localization, SLAM, motion control, planning and learning.",
      bullets: ["Localization & SLAM", "Motion planning", "Human–robot interaction"],
      url: "https://github.com/matejpopovski/Autonomous_Robotics_CS639",
    },
    {
      rank: "J", suit: "♣",
      title: "CPU vs GPU",
      tag: "PyTorch · MNIST",
      blurb: "The same digit-recognition model trained on CPU and on Apple GPU (MPS). The GPU won every time, cutting training time by more than 30%.",
      bullets: ["PyTorch training loop", "MPS acceleration", ">30% faster on GPU"],
      url: "https://github.com/matejpopovski/CPUvsGPU",
    },
    {
      rank: "10", suit: "♠",
      title: "Programming III",
      tag: "Java · CS 400",
      blurb: "Search trees, graphs, traversal algorithms and hash tables, tested with JUnit 5 and shipped as an app with a real user interface.",
      bullets: ["Trees, graphs, hashing", "JUnit 5 + complexity analysis", "Makefiles, Bash, Git"],
      url: "https://github.com/matejpopovski/CS400-Programming3",
    },
    {
      rank: "9", suit: "♥",
      title: "AI-Assisted SD",
      tag: "AI · Software Design",
      blurb: "Exploring how AI changes the way software gets designed and built, from first sketch to working code.",
      bullets: ["AI pair programming", "Software design", "Workflow experiments"],
      url: "https://github.com/matejpopovski/AI-Assisted-SD",
    },
  ],

  links: [
    { label: "GitHub", url: "https://github.com/matejpopovski" },
    { label: "Website", url: "https://matejpopovski.com/" },
  ],

  // Wordle answers for the mini game (5 letters each)
  words: ["ROBOT", "MATEJ", "PIXEL", "TRAIN", "CARDS", "GRAPH", "STACK", "LOGIC", "SPADE", "DEBUG", "SWING", "LIDAR"],
};
