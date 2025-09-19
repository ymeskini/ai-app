// Note: You'll want to modify these evals, since they may be out of date.
// You should choose your own evals because we are actively testing for recency.

import type { UIMessage } from "ai";
import { evalite } from "evalite";
import { askDeepSearch } from "~/server/agent/deep-search";
import { Factuality } from "~/lib/evals/faculty-scorer";

evalite("Arsenal", {
  data: async (): Promise<{ input: string; expected: string }[]> => {
    return [
      {
        input: "Who cost more to sign, Bukayo Saka or Gabriel Martinelli?",
        expected: `Gabriel Martinelli was signed from Ituano for 7.10m euros.
          Bukayo Saka came from Arsenal's academy, so he cost no money to sign.`,
      },
      {
        input: `Arsenal sold several players in the 2024 summer transfer window.
          Which of those players is performing best?`,
        expected: `Reiss Nelson was sold to Fulham in 2024 for 18m euros.
          He is not playing often for Fulham - 11 games this season with one goal.
          Emile Smith Rowe was also sold to Fulham in 2024 for £27 million.
          He is playing regularly for Fulham - 35 games this season with 5 goals.
          Aaron Ramsdale was sold to Southampton in 2024 for £18m.
          He is playing regularly - 25 games this season, though Southampton are
          performing poorly which reflects badly on a goalkeeper.

          Overall, Emile Smith Rowe is probably performing the best.
        `,
      },
      {
        input: `Which of Arsenal's players was injured the most in the 2024-2025 season?
          Which of these injuries impacted Arsenal's performance the most?`,
        expected: `Takehiro Tomiyasu's injury was the longest.
          Kai Havertz was also injured, and his injury was very impactful.
          Bukayo Saka has been injured for less time than Kai Havertz, but
          since he is a better player than Havertz, his injury has impacted
          Arsenal's performance more.
          Gabriel Magalhaes was also injured recently, but Jakob Kiwior has
          deputised well.
          Gabriel Jesus was also injured, and was out for a long time. His absence
          led to Mikel Merino (a defensive midfielder by trade) playing up front.
          `,
      },
      {
        input: `Why didn't Arsenal win the league this season?`,
        expected: `Arsenal were good enough to win the league this season,
          but were hampered by injuries to players at the wrong time.
          They had some unfortunate red cards at the beginning of the season,
          and it's arguable this hurt their momentum.
          However, the injuries were the most impactful reason.
          Many felt that since Manchester City dropped off in the 2024/25 season,
          Arsenal were the best team remaining and should have won the league.
          However, Liverpool ended up winning the league.
          At the time of writing, the league is not finished - but Liverpool
          are many points clear of Arsenal.
        `,
      },
      {
        input: `Which Arsenal player has played the most minutes this season?`,
        expected: `
          The player who has played the most minutes this season is the goalkeeper, David Raya,
          with 4,350 minutes. This is across all competitions, including the Premier League,
          FA Cup, League Cup, and Champions League.

          `,
      },
      {
        input: `Which Arsenal player has scored the most goals in the Champions League in the 2024-2025 season?`,
        expected: `Bukayo Saka: 5 goals`,
      },
      {
        input: `In this season, are Arsenal better in the first half of games, or the second half of games?`,
        expected: `Arsenal are winning the 'first half table', a premier league table that
          only includes the first half of each game. They have a +18 goal difference at the
          start of games, and would have scored 63 points if the table did not include
          the second half of games.

          However, they are worse in the second half of games. They would have scored
          54 points in the second half of games, compared to 63 in the first half.
          Liverpool are the best team in the second half of games, with 75 points.`,
      },
      {
        input: `How do I pnpm upgrade only a certain set of dependencies - ones starting with @tanstack`,
        expected: `pnpm upgrade "@tanstack/*"`,
      },
      {
        input: "How do you do a 404 page in tanstack start?",
        expected: `
        import { createRouter, Link } from '@tanstack/react-router'

        const router = createRouter({
          defaultNotFoundComponent: () => {
            return (
              <div>
                <p>Not found!</p>
                <Link to="/">Go home</Link>
              </div>
            )
          },
        })
        `,
      },
      {
        input: "How do I export subtitles from DaVinci Resolve?",
        expected: `Exporting Subtitles as a Separate File (SRT):

Deliver Page: Go to the Deliver page in DaVinci Resolve.
Render Settings: In the "Render Settings" panel, make sure to check the "Export Subtitle" option.
Format: Choose "Subtitle Files (*.srt)" or your desired format. SRT is widely compatible.
Burn into Video: Uncheck the "Burn into video" option if you want a separate subtitle file.
Export: Add the job to the render queue and render. DaVinci Resolve will create both the video file and a separate .srt file.`,
      },
      {
        input: `How do you create an electron app which can monitor your audio?`,
        expected: `
        Creating an Electron app to monitor audio involves several steps, and the approach can vary depending on the target operating system due to platform-specific limitations. Here's a breakdown of the process:

**1. Project Setup and Core Structure**

*   **Electron Framework:** Electron is a framework for building desktop applications using web technologies such as JavaScript, HTML, and CSS ([Electron: Build cross-platform desktop apps with JavaScript, HTML ...](https://electronjs.org/)). It combines Chromium and Node.js into a single runtime.
*   **Basic Files:** A basic Electron app consists of \`package.json\` (metadata, dependencies), \`main.js\` (main process, app lifecycle), and \`index.html\` (renderer process, user interface) ([Nydareld/electron-audio-visualizer - GitHub](https://github.com/Nydareld/electron-audio-visualizer)).
*   **Main and Renderer Processes:** The \`main.js\` file runs the main process, which controls the application's lifecycle. The \`index.html\` file runs the renderer process, which is essentially a browser window displaying the UI ([How to Build Your First Desktop App with JavaScript Using Electron](https://www.freecodecamp.org/news/how-to-build-your-first-app-with-electron-41ebdb796930/)).

**2. Audio Capture**

*   **\`desktopCapturer\` API:** Electron provides the \`desktopCapturer\` API to access media sources that can be used to capture audio and video from the desktop ([desktopCapturer - Electron](https://electronjs.org/docs/latest/api/desktop-capturer)).
*   **\`navigator.mediaDevices.getUserMedia\`:** This API is used to capture audio and video streams. You can use it in conjunction with \`desktopCapturer\` to capture audio from specific sources ([desktopCapturer - Electron](https://electronjs.org/docs/latest/api/desktop-capturer)).
*   **Cross-Platform Considerations:**
    *   The \`desktopCapturer\` and \`navigator.mediaDevices.getUserMedia\` APIs can be used to capture audio and video from the desktop ([desktopCapturer - Electron](https://electronjs.org/docs/latest/api/desktop-capturer)).
    *   On macOS, \`navigator.mediaDevices.getUserMedia\` does not work for audio capture due to the requirement of a signed kernel extension, which Chromium (and therefore Electron) does not provide ([desktopCapturer - Electron](https://electronjs.org/docs/latest/api/desktop-capturer)).

**3. macOS Audio Capture Workarounds**

*   **Soundflower (or similar):** One workaround involves using another macOS app like Soundflower to capture system audio and pass it through a virtual audio input device ([Electron desktopCapturer for MacOS - Stack Overflow](https://stackoverflow.com/questions/69636306/electron-desktopcapturer-for-macos), [desktopCapturer - Electron](https://electronjs.org/docs/latest/api/desktop-capturer)). This virtual device can then be queried with \`navigator.mediaDevices.getUserMedia\`.
*   **Swift Binary:** Another solution involves creating a Swift binary with ScreenCaptureKit (for macOS 13.0-14.1) and Core Audio Hardware Taps (for macOS 14.2+) ([macOS: Capture system audio and use it in Electron.js](https://stackoverflow.com/questions/76476274/macos-capture-system-audio-and-use-it-in-electron-js)).

**4. Audio Processing and Visualization**

*   **Web Audio API:** The Web Audio API is a powerful tool for processing and visualizing audio in the browser ([Web Audio API - MDN Web Docs - Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)).
*   **Audio Analysis:** The Web Audio API has the \`AudioAnalyser\` node, which is required for the visualizer as it provides the frequency or time domain response ([How to build an audio player in electron | by Sourav De - Medium](https://medium.com/@SrvZ/build-a-audio-player-in-electron-e1b133776c6)).
*   **Visualization:** Use the Canvas API to visualize the audio data. This involves extracting frequency, waveform, and other data from your audio source, which can then be used to create visualizations ([Visualizations with Web Audio API - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)).
*   **Libraries:**
    *   **Essentia.js:** A JavaScript library for audio and music analysis and processing ([essentia.js | JavaScript library for music/audio analysis and ...](https://mtg.github.io/essentia.js/)). It supports both real-time and offline audio analysis use-cases.
    *   **Howler.js:** A JavaScript audio library that makes working with audio in JavaScript easy and reliable across all platforms ([howler.js - JavaScript audio library for the modern web](https://howlerjs.com/)).
    *   **Tone.js:**  A framework for creating interactive music in the browser.

**5. Code Example (Conceptual)**

Below is a conceptual outline.  Refer to the linked documentation for specific code implementations.

**Important Considerations:**

*   **Permissions:**  Ensure you handle user permissions correctly for accessing audio devices.
*   **macOS System Audio:**  Remember the limitations on macOS and implement the necessary workarounds.
*   **Performance:**  Audio processing and visualization can be resource-intensive. Optimize your code to ensure smooth performance.
*   **Security:**  Be mindful of security best practices when building Electron applications, especially when dealing with user input and external resources.

This information should provide a solid foundation for creating your Electron audio monitoring application. Remember to consult the linked resources for more detailed information and code examples.

        `,
      },
      // {
      //   input: `Which Arsenal player has scored the most goals from corners in the 2024-2025 season, in the Champions League?`,
      //   expected: ``,
      // },
    ];
  },
  task: async (input) => {
    const messages: UIMessage[] = [
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: input }],
      },
    ];
    return askDeepSearch(messages);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Regular expression to match markdown links [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});
