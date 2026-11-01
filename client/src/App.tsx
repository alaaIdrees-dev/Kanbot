function App() {
  return (
    <main className="welcome">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="brand-mark" aria-hidden="true">
          K
        </div>
        <p className="eyebrow">YOUR SPRINT BOARD, REIMAGINED</p>
        <h1 id="welcome-title">
          Meet your new
          <br />
          <span>AI teammate.</span>
        </h1>
        <p className="intro">
          Keep your ideas, sprints, and team in sync. Your next great sprint
          starts here.
        </p>
        <button className="get-started" type="button">
          Get started <span aria-hidden="true">→</span>
        </button>
        <p className="sign-in">
          Already have an account? <a href="#sign-in">Sign in</a>
        </p>
      </section>
      <div className="decor decor-one" aria-hidden="true" />
      <div className="decor decor-two" aria-hidden="true" />
    </main>
  );
}

export default App;
