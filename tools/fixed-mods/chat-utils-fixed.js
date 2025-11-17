// Fixed chat utils mod — corrected runtime errors and added defensive checks
// Replace the original mod file with this one (or point me to the original path and I will patch it in-place).

(function(){
  // Keep everything in an IIFE and wait for ModAPI to be available on this deployment.
  const READY_POLL_MS = 50;
  const MAX_POLLS = 200; // ~10s

  let lastX;
  let lastY;
  let lastZ;
  let webhookURL = 'REPLACE WEBHOOK';
  let songplayer = null; // lazy-create to avoid autoplay issues
  let oldVolume = 0.1;
  let loopToggle = false;

  function createPlayer(src) {
    try {
      const p = new Audio(src || 'https://files.catbox.moe/k4j25x.mp3');
      p.volume = oldVolume;
      return p;
    } catch (e) {
      console.warn('Audio creation failed', e);
      return null;
    }
  }

  function safeSendChat(msg) {
    try { ModAPI.displayToChat && ModAPI.displayToChat({msg}); } catch(e) {}
  }

  function registerHandlers() {
    // Ensure player global is generated
    try { ModAPI.require && ModAPI.require('player'); } catch(e) {}

    ModAPI.addEventListener && ModAPI.addEventListener('sendchatmessage', function(e) {
      try {
        if (typeof e.message !== 'string') return;

        if (e.message == '.help') {
          e.preventDefault = true;
          safeSendChat('\n§6[-COMMANDS-]\n§3.help §6| §aDisplays this help dialogue\n§3.spawn §6| §aAttempts to set player coordinates to 0, 0\n§3.pos §6| §aSends a chat message with your current position\n§3.time §6| §aSends a chat message with your current time\n§3.lastpos §6| §aAttempts to return you to your last position\n§3.goto §6| §aAttempts to teleport to the set position\n§3.setpos §6| §aSets the position for .goto\n§3.bugreport §b[msg] §6| §aSends a message through a webhook\n§3.play §6| §aPlays the song (Lo-fi by default)\n§3.pause §6| §aPauses the song\n§3.replay §6| §aReplays the song\n§3.volume §b[int] §6| §aSets the volume of the song (max is 100)\n§3.src §6| §aOpens a new tab with the src of the project\n§3.setsong §b[url] §6| §aSets a url for the song player\n§3.loop §6| §aToggles looping on the song (Off by default)');
        } else if (e.message == '.time') {
          e.preventDefault = true;
          ModAPI.player && ModAPI.player.sendChatMessage && ModAPI.player.sendChatMessage({message: 'My current date and time is [ ' + new Date().toString() + ' ]'});
        } else if (e.message == '.spawn') {
          e.preventDefault = true;
          if (ModAPI.player) {
            lastX = ModAPI.player.x;
            lastY = ModAPI.player.y;
            lastZ = ModAPI.player.z;
            setTimeout(() => {
              ModAPI.player.x = 0;
              ModAPI.player.z = 0;
              ModAPI.player.y = 70;
              ModAPI.player.reload && ModAPI.player.reload();
            }, 5);
          }
        } else if (e.message == '.lastpos') {
          e.preventDefault = true;
          if (ModAPI.player && typeof lastX !== 'undefined') {
            ModAPI.player.x = lastX;
            ModAPI.player.y = lastY;
            ModAPI.player.z = lastZ;
            ModAPI.player.reload && ModAPI.player.reload();
          }
        } else if (e.message == '.pos') {
          e.preventDefault = true;
          if (ModAPI.player) {
            ModAPI.player.sendChatMessage && ModAPI.player.sendChatMessage({message: 'My current position is [ ' + Math.floor(ModAPI.player.x) + ', ' + Math.floor(ModAPI.player.y) + ', ' + Math.floor(ModAPI.player.z) + ' ] '});
          }
        } else if (e.message.startsWith('.bugreport ')) {
          e.preventDefault = true;
          safeSendChat('§3Bug report: §b' + e.message.substr(11));
          sendBugReport(e.message.substr(11).toString());
        } else if (e.message == '.setpos') {
          e.preventDefault = true;
          safeSendChat('§3Setting position...');
          if (ModAPI.player) {
            lastX = ModAPI.player.x;
            lastY = ModAPI.player.y;
            lastZ = ModAPI.player.z;
          }
          setTimeout(() => { safeSendChat('§3Position set!'); }, 100);
        } else if (e.message == '.goto') {
          e.preventDefault = true;
          if (ModAPI.player && typeof lastX !== 'undefined') {
            ModAPI.player.x = lastX;
            ModAPI.player.y = lastY;
            ModAPI.player.z = lastZ;
            ModAPI.player.reload && ModAPI.player.reload();
          }
        } else if (e.message == '.src') {
          e.preventDefault = true;
          try { window.open("https://raw.githubusercontent.com/AstralisLLC/EaglerForge-Mods/main/chat%20utils.js"); } catch(e){}
        } else if (e.message == '.play') {
          e.preventDefault = true;
          if (!songplayer) songplayer = createPlayer();
          songplayer && songplayer.play && songplayer.play().catch(() => {});
          safeSendChat('§3Now playing lo-fi');
        } else if (e.message == '.pause') {
          e.preventDefault = true;
          songplayer && songplayer.pause && songplayer.pause();
          safeSendChat('§3Lo-fi paused');
        } else if (e.message == '.replay') {
          e.preventDefault = true;
          songplayer && songplayer.load && songplayer.load();
          safeSendChat('§3Replaying lo-fi');
        } else if (e.message.startsWith('.volume ')) {
          e.preventDefault = true;
          try {
            let v = parseInt(e.message.substr(8), 10);
            if (!isNaN(v)) {
              oldVolume = Math.max(0, Math.min(1, v / 100));
              if (!songplayer) songplayer = createPlayer();
              songplayer && (songplayer.volume = oldVolume);
              safeSendChat('§3Volume set to ' + v);
            }
          } catch (error) { safeSendChat('§6[§4ERROR§6] §c' + error); }
        } else if (e.message.startsWith('.setsong ') && e.message.substr(9).startsWith('https://')) {
          e.preventDefault = true;
          if (songplayer) { try { songplayer.pause(); } catch(e){} }
          songplayer = createPlayer(e.message.substr(9));
          safeSendChat('§3URL was set to §6[ §b' + e.message.substr(9) + ' §6]');
        } else if (e.message.startsWith('.setsong')) {
          e.preventDefault = true;
          safeSendChat('§6[§4ERROR§6] §cThis command requires a URL');
        } else if (e.message == '.loop') {
          e.preventDefault = true;
          if (!songplayer) songplayer = createPlayer();
          if (songplayer) songplayer.loop = loopToggle;
          loopToggle = !loopToggle;
          safeSendChat('§3Loop is now set to §6[ §a' + loopToggle + ' §6]');
        } else if (e.message.startsWith('.')) {
          e.preventDefault = true;
          safeSendChat('§6[§4ERROR§6] §cNo such command, use .help for available commands');
        }
      } catch (err) {
        console.error('Chat command handler error', err);
      }
    });
  }

  function sendBugReport(report) {
    // Only attempt to send if webhookURL has been changed from the placeholder
    if (!webhookURL || webhookURL === 'REPLACE WEBHOOK') return;
    try {
      // Use fetch; if CORS blocks it the promise will reject — catch to avoid crashing.
      fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: report })
      }).catch(err => console.warn('Bug report send failed', err));
    } catch (err) {
      console.warn('sendBugReport failed', err);
    }
  }

  function pollForModAPI(attempt) {
    if (typeof ModAPI !== 'undefined' && ModAPI && ModAPI.addEventListener) {
      try { registerHandlers(); } catch(e) { console.error('registerHandlers failed', e); }
      return;
    }
    if (attempt >= MAX_POLLS) {
      console.warn('ModAPI not available after polling; aborting chat-utils registration');
      return;
    }
    setTimeout(() => pollForModAPI(attempt + 1), READY_POLL_MS);
  }

  // start polling
  pollForModAPI(0);

})();

function updateDate() {
  // Not doing anything heavy; updateDate left for future use
  const date = new Date();
  // if you want to use it elsewhere, store it to a variable or handle formatting here
}

// Pass the function reference — changed interval to 1000 ms to be reasonable
setInterval(updateDate, 1000);

async function sendBugReport(report) {
  try {
    var request = new XMLHttpRequest();
    request.open("POST", webhookURL);
    request.setRequestHeader("Content-type", "application/json");
    var params = {
      content: report
    };
    request.send(JSON.stringify(params));
  } catch (err) {
    console.error('sendBugReport failed', err);
  }
}
