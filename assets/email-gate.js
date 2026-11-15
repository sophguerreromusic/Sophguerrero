/* Sounds Good Club — tracklist unlock (email via Kit)
   sophguerrero.com/mixes/
   - Tracklist stays in the HTML, so Google can still read it.
   - Visitors see it blurred until they join the Sounds Good Club list.
   - Once unlocked, it stays unlocked on that browser.
*/
(function () {
  var KIT_FORM_URL = "https://app.kit.com/forms/10191903/subscriptions";
  var STORAGE_KEY = "sg_tracklist_unlocked";

  var section = document.querySelector(".tracklist");
  var list = section && section.querySelector(".cues");
  if (!section || !list) return;

  function isUnlocked() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { return false; }
  }
  function remember() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
  }
  if (isUnlocked()) return;

  var css = document.createElement("style");
  css.textContent = [
    ".tracklist.sg-locked{position:relative}",
    ".tracklist.sg-locked .cues{filter:blur(6px);opacity:.55;pointer-events:none;user-select:none;max-height:520px;overflow:hidden;",
    "  -webkit-mask-image:linear-gradient(#000 40%,transparent);mask-image:linear-gradient(#000 40%,transparent);transition:filter .5s,opacity .5s}",
    ".tracklist .cues{transition:filter .5s,opacity .5s}",
    ".sg-gate{position:absolute;left:50%;top:120px;transform:translateX(-50%);width:min(440px,calc(100% - 24px));z-index:2;",
    "  background:rgba(42,40,48,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);",
    "  border:1px solid var(--char-2,#3a3742);border-radius:14px;padding:26px 22px;text-align:center;color:var(--paper,#f2efea);font-family:var(--sans,system-ui,sans-serif)}",
    ".sg-gate h3{font-family:var(--display,inherit);font-weight:600;font-size:22px;margin:0 0 6px;letter-spacing:.01em}",
    ".sg-gate p{margin:0 0 18px;color:var(--paper-dim,#bdb8c4);font-size:14px;line-height:1.5}",
    ".sg-gate form{display:flex;gap:8px}",
    ".sg-gate input[type=email]{flex:1;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid var(--char-2,#3a3742);",
    "  background:var(--ink,#121115);color:var(--paper,#f2efea);font:inherit;font-size:16px}",
    ".sg-gate input[type=email]:focus{outline:none;border-color:var(--lav,#c8bfdc)}",
    ".sg-gate button,.sg-gate .sg-yt{padding:12px 16px;border-radius:10px;font:inherit;font-weight:600;font-size:14px;cursor:pointer;letter-spacing:.04em;text-transform:uppercase}",
    ".sg-gate button{border:0;background:var(--lav,#c8bfdc);color:var(--ink,#121115)}",
    ".sg-gate button:disabled{opacity:.6;cursor:wait}",
    ".sg-gate .sg-consent{font-size:11.5px;color:var(--paper-dim,#bdb8c4);margin:10px 0 0;opacity:.85}",
    ".sg-gate .sg-or{display:flex;align-items:center;gap:10px;margin:18px 0 14px;font-family:var(--mono,monospace);font-size:11px;color:var(--paper-dim,#bdb8c4);text-transform:uppercase;letter-spacing:.12em}",
    ".sg-gate .sg-or:before,.sg-gate .sg-or:after{content:'';flex:1;height:1px;background:var(--char-2,#3a3742)}",
    ".sg-gate .sg-yt{display:block;border:1px solid var(--char-2,#3a3742);color:var(--paper,#f2efea);text-decoration:none}",
    ".sg-gate .sg-yt:hover{border-color:var(--lav,#c8bfdc)}",
    ".sg-gate .sg-msg{font-size:13px;margin:10px 0 0;min-height:1em}",
    ".sg-gate .sg-msg.err{color:#ff9b9b}",
    ".selections.sg-locked{position:relative}",
    ".selections.sg-locked .sel-list{filter:blur(6px);opacity:.55;pointer-events:none;user-select:none;max-height:420px;overflow:hidden;",
    "  -webkit-mask-image:linear-gradient(#000 40%,transparent);mask-image:linear-gradient(#000 40%,transparent)}",
    ".selections .sel-list{transition:filter .5s,opacity .5s}",
    ".sg-mini{display:inline-block;margin:6px 0 18px;padding:12px 18px;border-radius:10px;border:0;background:var(--lav,#c8bfdc);color:var(--ink,#121115);font:inherit;font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}",
    "@media (max-width:720px){.sg-gate{position:relative;left:auto;top:auto;transform:none;width:auto;margin:0 0 18px;padding:22px 16px}.tracklist.sg-locked .cues{max-height:360px}.sg-gate form{flex-direction:column}.sg-gate button{width:100%}}"
  ].join("\n");
  document.head.appendChild(css);

  section.classList.add("sg-locked");

  // In Rotation lists the same records, so it is locked too (still in the HTML for Google).
  var sel = document.querySelector(".selections");
  var selList = sel && sel.querySelector(".sel-list");
  var mini = null;
  if (sel && selList) {
    sel.classList.add("sg-locked");
    mini = document.createElement("button");
    mini.type = "button";
    mini.className = "sg-mini";
    mini.textContent = "Join the Sounds Good Club to unlock ✦";
    mini.addEventListener("click", function () {
      gate.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(function () { input.focus({ preventScroll: true }); }, 500);
    });
    sel.insertBefore(mini, selList);
  }

  var gate = document.createElement("div");
  gate.className = "sg-gate";
  gate.setAttribute("role", "region");
  gate.setAttribute("aria-label", "Unlock the tracklist");
  gate.innerHTML =
    '<h3>Sounds Good Club ✦</h3>' +
    '<p>Join to unlock the tracklist. New mix in your inbox every month.</p>' +
    '<form novalidate>' +
      '<input type="email" name="email_address" placeholder="your@email.com" autocomplete="email" required aria-label="Email address">' +
      '<button type="submit">Join</button>' +
    '</form>' +
    '<p class="sg-consent">I\'m happy to get emails from Sophia Guerrero. Unsubscribe anytime.</p>' +
    '<p class="sg-msg" aria-live="polite"></p>';
  section.insertBefore(gate, list);

  function unlock() {
    remember();
    section.classList.remove("sg-locked");
    gate.remove();
    if (sel) sel.classList.remove("sg-locked");
    if (mini) mini.remove();
  }

  // Email path: sends the address to the Kit form, then unlocks.
  var form = gate.querySelector("form");
  var input = form.querySelector("input");
  var btn = form.querySelector("button");
  var msg = gate.querySelector(".sg-msg");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.className = "sg-msg err";
      msg.textContent = "Please enter a valid email.";
      input.focus();
      return;
    }
    btn.disabled = true;
    msg.className = "sg-msg";
    msg.textContent = "";

    var data = new FormData();
    data.append("email_address", email);

    fetch(KIT_FORM_URL, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .catch(function () {
        // If the browser blocks reading Kit's reply, send it anyway without reading the reply.
        return fetch(KIT_FORM_URL, { method: "POST", body: data, mode: "no-cors" });
      })
      .then(function () {
        unlock();
        var note = document.createElement("p");
        note.className = "sec-label";
        note.style.cssText = "margin-top:14px;color:var(--lav,#c8bfdc)";
        note.textContent = "Welcome to the club ✦ Check your inbox to confirm.";
        section.appendChild(note);
      })
      .catch(function () {
        btn.disabled = false;
        msg.className = "sg-msg err";
        msg.textContent = "Something went wrong. Please try again.";
      });
  });
})();
