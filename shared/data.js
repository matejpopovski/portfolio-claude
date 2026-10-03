/*
 * All site content lives here. Edit this file to update the portfolio;
 * every version (v1–v6) renders from it, so nothing else needs to change.
 *
 * Sources: matejpopovski.com and github.com/matejpopovski.
 */
window.PORTFOLIO = {
  name: "Matej Popovski",
  first: "MATEJ",
  last: "POPOVSKI",
  title: "Software & Machine Learning Engineer",
  role: "MS Computer Science (AI & ML) · UW–Madison",
  location: "Madison, Wisconsin",
  email: "matej.popovski@gmail.com",
  yearsExperience: "4+",

  // Rotating phrases in hero sections ("Matej ___")
  verbs: [
    "teaches robots where they are",
    "trains snakes with deep Q-learning",
    "finds marathon runners by their bib",
    "spots cracks in microchips",
    "races CPUs against GPUs",
    "builds things that feel good to use",
  ],

  about: [
    "I'm a software and machine learning engineer finishing a Master's in Computer Science, focused on AI and ML, at the University of Wisconsin–Madison, after a double major in Computer Science and Data Science there.",
    "I have 4+ years of experience across software development and data analytics: cloud and scripting work at Labcorp, data pipelines at Continental Properties, and a lot of projects where models leave the notebook and do something you can see: a robot localizing itself, a snake learning to survive, an app that finds you in a pile of race photos.",
  ],

  facts: [
    { k: "Based in", v: "Madison, WI" },
    { k: "Studying", v: "MS CS · AI & ML" },
    { k: "Experience", v: "4+ years" },
    { k: "Into", v: "Robotics · Vision · RL" },
  ],

  education: [
    { school: "University of Wisconsin–Madison", degree: "MS Computer Science · AI & ML", years: "2025 – now" },
    { school: "University of Wisconsin–Madison", degree: "BS Computer Science + Data Science (double major)", years: "2021 – 2025" },
  ],

  // Newest first. Pulled from the timeline on matejpopovski.com.
  timeline: [
    {
      year: "2025", kind: "edu",
      title: "Master's in CS, AI & ML", org: "UW–Madison", duration: "ongoing",
      details: "Went further into artificial intelligence and machine learning: computer vision, autonomous robotics, machine learning theory.",
    },
    {
      year: "2024", kind: "work",
      title: "Data Analyst Intern", org: "Continental Properties", duration: "3 months",
      details: "Parsed real-time JSON with SQL and generated and maintained .yml files with Python. Built data pipelines, optimized ETL transformations and created reports with Matillion, dbt, Snowflake and Power BI.",
    },
    {
      year: "2023", kind: "work",
      title: "Software Engineer Intern", org: "Labcorp", duration: "3 months",
      details: "First full-time internship, across multiple projects. Worked in AWS, improved how data flowed between systems, and wrote JavaScript tooling.",
    },
    {
      year: "2022", kind: "work",
      title: "Computer Assistant", org: "Square Circle Consulting", duration: "2 years, part-time",
      details: "Made an HTML-only website mobile-responsive with CSS and JavaScript, and solved hardware and software problems directly with customers.",
    },
    {
      year: "2021", kind: "edu",
      title: "BS Computer Science + Data Science", org: "UW–Madison", duration: "4 years",
      details: "Data structures, computer architecture, operating systems, software engineering and object-oriented programming.",
    },
    {
      year: "2016", kind: "origin",
      title: "First line of code", org: "Middle school", duration: "the beginning",
      details: "Wrote my first C++ in Code::Blocks for an informatics class, then picked up object-oriented programming in high school.",
    },
  ],

  skills: [
    "Python", "Java", "Swift", "JavaScript", "SQL", "PyTorch", "TensorFlow", "Keras",
    "Computer Vision", "YOLO", "Transfer Learning", "Reinforcement Learning",
    "Particle Filters", "SLAM", "Streamlit", "AWS", "Snowflake", "dbt", "Power BI", "Git",
  ],

  // Skill groups for designs that want structure.
  stack: [
    { group: "Languages", items: ["Python", "Java", "Swift", "JavaScript", "SQL", "C++"] },
    { group: "Machine learning", items: ["PyTorch", "TensorFlow", "Keras", "YOLOv12", "MobileNet", "DQN", "Whisper"] },
    { group: "Robotics & vision", items: ["Monte Carlo localization", "EKF", "SLAM", "OCR", "Fine-tuning"] },
    { group: "Data", items: ["Snowflake", "dbt", "Matillion", "Power BI", "AWS"] },
    { group: "Apps", items: ["SwiftUI", "Streamlit", "Pygame", "Java Swing", "CustomTkinter"] },
  ],

  // Projects, best first. rank + suit are used by the card-deck design.
  // image: screenshot hosted on matejpopovski.com (some are several MB, so lazy-load them).
  projects: [
    {
      rank: "A", suit: "♠", year: "2026", area: "Computer vision",
      title: "Microchip Defect Detection",
      tag: "Transfer learning · MobileNetV2/V3",
      blurb: "A vision pipeline that classifies microchip surface defects (crack, hole, rust, scratch or normal) with lightweight pretrained CNNs, built for fast industrial inspection.",
      bullets: ["100% accuracy on 3,000 test images", "MobileNetV2 vs V3 benchmark", "Runs on Apple MPS, CUDA or CPU"],
      stat: { value: "100%", label: "test accuracy" },
      url: "https://github.com/matejpopovski/Microchip-Defect-Detection",
      image: "https://matejpopovski.com/assets/MicroChipDefect1.png",
    },
    {
      rank: "K", suit: "♥", year: "2025", area: "Computer vision",
      title: "Hand Gesture Interface",
      tag: "YOLOv12 · Fine-tuning",
      blurb: "Controlling a computer with hand gestures: a fine-tuned YOLOv12 detector turns what the webcam sees into commands. Final project for CS 566, Computer Vision.",
      bullets: ["Fine-tuned YOLOv12", "Real-time webcam inference", "Project write-up site"],
      stat: { value: "v12", label: "YOLO, fine-tuned" },
      url: "https://matejpopovski.github.io/CS566_CV_FinalProject_Webpage/",
      image: "https://matejpopovski.com/assets/handgesture.png",
    },
    {
      rank: "Q", suit: "♦", year: "2026", area: "Robotics",
      title: "Particle Filter Simulator",
      tag: "Java · Monte Carlo localization",
      blurb: "An interactive Java simulator for probabilistic robot localization. Drive the robot and watch noisy sensors, particle weighting and resampling collapse the cloud onto its true pose.",
      bullets: ["Noisy motion + sensor models", "Importance weighting & resampling", "Ships as a runnable .jar"],
      stat: { value: "MCL", label: "Bayesian filtering" },
      url: "https://github.com/matejpopovski/particle-filter",
      image: "https://matejpopovski.com/assets/robot_particle_filter.png",
    },
    {
      rank: "J", suit: "♣", year: "2025", area: "Reinforcement learning",
      title: "Snake, Learned",
      tag: "Deep Q-learning · TensorFlow",
      blurb: "A DQN agent that teaches itself Snake through self-play. After about 100 games it stops hitting walls and itself and starts hunting food.",
      bullets: ["Deep Q-Network", "Reward shaping", "Learns in ~100 games"],
      stat: { value: "~100", label: "games to learn" },
      url: "https://github.com/matejpopovski/Reinforcement-Learning",
      image: "https://matejpopovski.com/assets/snake2.png",
    },
    {
      rank: "10", suit: "♠", year: "2025", area: "Computer vision",
      title: "RunnerFinder",
      tag: "OCR · Streamlit",
      blurb: "Give it a folder of marathon photos and a bib number, and it finds every photo of that runner, even when the number is half hidden, using OCR and fuzzy LCS matching.",
      bullets: ["OCR over whole photo folders", "Fuzzy match for occluded bibs", "Streamlit UI with live progress"],
      stat: { value: "LCS", label: "fuzzy bib matching" },
      url: "https://github.com/matejpopovski/RunnerFinder",
      image: "https://matejpopovski.com/assets/runnerfinder.png",
    },
    {
      rank: "9", suit: "♥", year: "2026", area: "AI tools",
      title: "AI Meeting Assistant",
      tag: "Whisper · LLMs",
      blurb: "Records your mic, transcribes locally with Whisper in near real time, then uses an LLM to summarize, pull out action items, answer questions and export notes to Markdown.",
      bullets: ["Local Whisper speech-to-text", "LLM summaries & action items", "Desktop GUI, Markdown export"],
      stat: { value: "live", label: "local transcription" },
      url: "https://github.com/matejpopovski/STT",
    },
    {
      rank: "8", suit: "♦", year: "2024", area: "Machine learning",
      title: "CPU vs GPU",
      tag: "PyTorch · CNN · MNIST",
      blurb: "The same CNN trained on MNIST on the CPU and on the Apple GPU (MPS) for 5, 10 and 20 epochs, timed head to head. The GPU won every round.",
      bullets: ["PyTorch training loop", "5 / 10 / 20 epoch benchmark", "MPS acceleration"],
      stat: { value: "GPU", label: "won every run" },
      url: "https://github.com/matejpopovski/DigitReaderModel",
      image: "https://matejpopovski.com/assets/CPU-vs-GPU.jpg",
    },
    {
      rank: "7", suit: "♣", year: "2024", area: "Data",
      title: "YML File Updater",
      tag: "Python · dbt",
      blurb: "A recursive Python script, born at Continental Properties, that generates and updates dbt .yml files so the docs keep up with the models.",
      bullets: ["Recursive file walking", "dbt schema files", "Used in a real pipeline"],
      stat: { value: "dbt", label: "docs on autopilot" },
      url: "https://github.com/matejpopovski/yml-updater",
    },
    {
      rank: "6", suit: "♠", year: "2024", area: "Mobile",
      title: "LineLeap2",
      tag: "Swift · SwiftUI",
      blurb: "An iOS proof of concept for skipping the line at bars and events, built to explore SwiftUI navigation, transitions and custom styling.",
      bullets: ["SwiftUI navigation", "Custom transitions", "Built in Xcode"],
      stat: { value: "iOS", label: "SwiftUI app" },
      url: "https://github.com/matejpopovski/LineLeap2",
    },
    {
      rank: "5", suit: "♥", year: "2024", area: "Games",
      title: "Chess",
      tag: "Python · Pygame",
      blurb: "Two-player chess in Pygame with full move rules and a clickable board.",
      bullets: ["Player vs player", "Pygame GUI", "Move validation"],
      stat: { value: "PvP", label: "local chess" },
      url: "https://github.com/matejpopovski/ChessGame",
    },
    {
      rank: "4", suit: "♦", year: "2024", area: "Games",
      title: "3 Card Poker",
      tag: "Pygame · OOP",
      blurb: "A poker table with animated dealing and a click-to-play GUI, with ctypes display scaling so it looks right on any screen.",
      bullets: ["Object-oriented engine", "Animated dealing", "ctypes display scaling"],
      stat: { value: "3", label: "card poker" },
      url: "https://github.com/matejpopovski/Poker-Game",
    },
    {
      rank: "3", suit: "♣", year: "2024", area: "Games",
      title: "Wordle",
      tag: "Java · Swing",
      blurb: "Wordle in Java Swing: six guesses at a hidden five-letter word on a graphical grid, built with event-driven OOP and file-based word lists.",
      bullets: ["Event-driven GUI", "File-based word lists", "Clean OOP structure"],
      stat: { value: "6", label: "guesses" },
      url: "https://github.com/matejpopovski/Wordle-Game",
    },
  ],

  // Course work worth linking.
  courses: [
    { code: "CS 639", name: "Autonomous Robotics", url: "https://github.com/matejpopovski/Autonomous_Robotics_CS639" },
    { code: "CS 760", name: "Machine Learning", url: "https://github.com/matejpopovski/CS760" },
    { code: "CS 566", name: "Computer Vision", url: "https://github.com/matejpopovski/CS566" },
    { code: "STAT 436", name: "Data Visualization", url: "https://github.com/matejpopovski/Data-Visualization" },
  ],

  links: [
    { label: "GitHub", url: "https://github.com/matejpopovski" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/matej-popovski/" },
    { label: "Email", url: "mailto:matej.popovski@gmail.com" },
  ],

  // Five-letter words for any mini Wordle
  words: ["ROBOT", "MATEJ", "PIXEL", "TRAIN", "CARDS", "GRAPH", "STACK", "LOGIC", "SPADE", "DEBUG", "SWING", "LIDAR", "SNAKE", "CHESS", "MODEL"],
};
