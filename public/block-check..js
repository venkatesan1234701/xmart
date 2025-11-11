setInterval(async () => {
  try {
    const res = await fetch('/api/check-block');
    const data = await res.json();
    if (data.blocked) {
      alert("You are blocked by admin. Logging out...");
      window.location.href = "/signin"; // redirect to login page
    }
  } catch (err) {
    console.error(err);
  }
}, 10000); // check every 10 seconds
