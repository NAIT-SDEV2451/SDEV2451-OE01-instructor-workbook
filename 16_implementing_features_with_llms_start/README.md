# Implementing Features with LLMs — Setting Up and Using Claude Code

> **IMPORTANT: being taught these tools doesn't mean you can use them everywhere.**
>
> Being taught these tools here doesn't mean you can use them for everything. AI use is decided course by course and assignment by assignment. Before using them for any course work, check that course's and assignment's policy with your instructor, and show them the workflow you intend to use. If the policy is unclear, ask first.

In lesson 15 we talked about what large language models are, what they're good and bad at, and what they can do to your skills if you stop paying attention. In this example we put that into practice. You'll set up an AI coding tool on the TicketMono project, build a small feature with it, and then judge the result using evidence rather than a gut feeling.

We're going to spread this out over two classes, and it's going to be more of a working session than a lecture. Expect to stop, try things, and compare results with the people around you.

We'll be using **Claude Code in VS Code**. We recommend it, but it's your call and your subscription. Almost everything here carries over to other tools, usually under a different name:

| Concept | Claude Code | Other tools (names change, so check their docs) |
|---|---|---|
| Project instructions | `CLAUDE.md` | `AGENTS.md`, `.github/copilot-instructions.md` |
| Smaller, targeted instructions | `.claude/rules/` | `.cursor/rules/`, `.github/instructions/` |
| Permissions and guardrails | `.claude/settings.json` | Each tool has its own settings |
| Reusable workflows | `.claude/skills/` | Prompt files, custom commands |
| Connecting outside tools | MCP | MCP |

---

## What We'll Cover in This Example

**Lesson 1: Discussion and setup**
- **Step 1** — What you're allowed to use this for
- **Step 2** — Prerequisites and installing Claude Code
- **Step 3** — Your first prompts, without changing anything
- **Step 4** — Context windows and caching

**Lesson 1: Establishing your tooling**
- **Step 5** — Generate and edit a `CLAUDE.md`
- **Step 6** — Write rules
- **Step 7** — Permission modes and their gaps
- **Step 8** — Add guardrails with `settings.json`
- **Step 9** — Build your first skill
- **Step 10** — What MCP is
- **Step 11** — Commit your setup

**Lesson 2: Building a feature**
- **Step 12** — Create the issue and branch
- **Step 13** — Plan the feature
- **Step 14** — Build it, reviewing every change

**Lesson 2: Evaluating the tool**
- **Step 15** — Run the tests and read the coverage report
- **Step 16** — Build a review skill
- **Step 17** — Score the result
- **Step 18** — Turn every miss into a rule
- **Step 19** — Check your usage, discuss how you used it, and open a pull request

---

# Lesson 1: Discussion and Setup

## Step 1 — What You're Allowed to Use This For

Before anyone installs anything, let's be clear about what learning this does and doesn't mean.

For this course, AI tools are allowed on the final project, as long as you document how you used them as its instructions describe. They aren't allowed on the quizzes or on assignments 1-3. Don't assume any of this applies to your other courses.

Before using these tools on other course work, go to your instructor and show them your intended workflow:

- **Which tool** you want to use
- **Which tasks** you'd use it for, and which you'd do yourself
- **How you'd review** what it produces
- **How you'd disclose** that you used it

**Discussion:** What would you show an instructor who asked how you plan to use this on a project? What would make them comfortable, and what wouldn't?

---

## Step 2 — Prerequisites and Installing Claude Code

### Backend
- Create a virtual environment inside `ticketmono_backend/` and install packages from `requirements.txt`.
- Run `python manage.py migrate` to apply migrations.
- Run `python manage.py runserver`.

### Frontend
- Run `npm install` inside `ticketmono_frontend/`.
- Run `npm run dev`.

### Loading Sample Data

> **Run all commands from inside `ticketmono_backend/` with your virtual environment active.**

```
python manage.py create_organizers
python manage.py loaddata event_data.json
```

This gives you two organizer accounts:

| Username | Password |
|---|---|
| `alice_organizer` | `Organizer@100` |
| `bob_organizer` | `Organizer@101` |

Create a regular user in Postman as well:

```
POST http://localhost:8000/api/v1/auth/register/
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "testpass123"
}
```

### Install Claude Code

Claude Code needs a paid Claude plan or a Claude Console account. [Plans and prices are listed here](https://claude.com/pricing). You're paying for this yourself, so decide what makes sense for you. If you pick another tool, you can still do the same steps in that tool.

1. In VS Code, open the Extensions view with `Ctrl+Shift+X` (`Cmd+Shift+X` on a Mac).
2. Search for **Claude Code** and install it.
3. Open the Claude Code panel, select **Sign in**, and finish signing in through your browser.

> **Important:** Open the `16_implementing_features_with_llms_start` folder itself in VS Code, with `File > Open Folder`. Claude Code looks for its project settings in the folder it starts in, so opening a parent folder means your settings won't load.

---

## Step 3 — Your First Prompts, Without Changing Anything

Start by looking at the mode shown in the footer of the prompt box. Change it to **Plan** for now, so that Claude can read your code but won't change it. We'll come back to what the modes mean in Step 7.

Keep an eye on the **context indicator** in the prompt box while you try these:

```
What does this project do, and how is it organized?
```

```
Walk me through what happens from the moment a user clicks Place Order to when the order is saved.
```

```
What can a logged-in user do to events through the API?
```

This step isn't setting Claude up for later. A new session starts with no memory of this conversation. It's here so you can see how the tool works when nothing's at stake, and to watch the context indicator climb as Claude reads your files.

**Check its work.** Open `event_tickets/views.py` and `serializers.py` yourself. Did it get that last answer right? `EventViewSet` is a `ModelViewSet` that only requires a user to be logged in. That means **any logged-in user can rename or delete any event**. Did the tool tell you that? We'll come back to this in the exercises.

When you're done, type `/clear` to start fresh.

---

## Step 4 — Context Windows and Caching

In lesson 15 we talked about how accuracy gets worse as context fills up. Here's how that works in practice, and why it costs you usage as well.

### What Actually Gets Sent

The model doesn't remember anything between messages. Every time you send a message, Claude Code sends **the whole thing again**: its instructions, your `CLAUDE.md`, every earlier message, and every file it has read. New content gets added to the end.

```
Turn 1:  [instructions] [CLAUDE.md] [your message]
Turn 2:  [instructions] [CLAUDE.md] [your message] [reply] [file it read] [next message]
Turn 3:  [instructions] [CLAUDE.md] [your message] [reply] [file it read] [next message] [reply] ...
```

So a one-line question late in a long session isn't a small request. It carries the whole conversation with it. And every tool Claude uses in a turn sends another request.

### What Caching Does

**Prompt caching** is why that's affordable. The start of each request is identical to the last one, so it's reused and charged at a much lower rate, and only the new part gets fully processed. Three things are worth knowing:

- **It only matches from the start of the request.** A change near the beginning means everything after it gets reprocessed.
- **It expires.** On a Claude subscription the main conversation usually gets an hour, and on an API key it's five minutes. Coming back after a long break means a slower, more expensive first message.
- **Some actions rebuild it.** Switching models is the common one, so pick your model at the start of a session.

### Habits That Follow From This

| Do this | When | Why |
|---|---|---|
| `/clear` | Switching to an unrelated task | Old context costs usage on every message and gets in the way |
| `/compact` | A natural break in a long task | Replaces your history with a summary, on your schedule rather than mid-task |
| `/rewind` | You went down the wrong path | Goes back to an earlier point, instead of summarizing a mistake into your context |
| `/usage` | Regularly | Shows what you've used and what's using it |
| Give specific prompts | Always | "Improve this codebase" makes it read everything. "Add validation to `CreateEventSerializer`" doesn't |
| Stop it | A task is running far too long | Press `Esc`. Don't pay for a spiral you can see from here |

This is also why the next step matters. `CLAUDE.md` gets sent with **every single message**, so a long one costs you all day.

---

# Lesson 1: Establishing Your Tooling

The tool you're about to configure works like a new developer joining your project. Here's where you tell it how your team works.

Your own preferences will grow over time too, but we won't be touching personal settings here. Everything in this example belongs to the project, and it would be committed for your whole team to share.

## Step 5 — Generate and Edit a `CLAUDE.md`

`CLAUDE.md` is a file of project instructions that gets loaded at the start of every session.

Type `/init`. It reads your codebase and writes a starting `CLAUDE.md` with commands, test instructions and any conventions it finds. If you already have one, it suggests improvements rather than overwriting it.

**Now read what it wrote**, because this is your first review of generated output. Go through it with these questions:

1. **Is it true?** Check the commands against what you actually ran in Step 2.
2. **Could Claude figure this out by reading the code?** If so, cut it. It's paying rent on every message.
3. **Is it generic?** "Write clean code" tells it nothing. Cut it.
4. **What can't it know?** Add that. For example, this is a course project, solutions should match the level of the existing code, and the sample data has no orders.

Aim for well under 200 lines. Ours took about 30.

> **Note:** `CLAUDE.md` is read when a session starts, so editing it during a session does nothing until you use `/clear`, `/compact` or restart.

---

## Step 6 — Write Rules

This is the part we think matters most. Rules are where your team's standards live, and it's where you'll spend your time improving how the tool works for you.

Rules are Markdown files in `.claude/rules/`. There are two kinds:

- **Rules without `paths`** load at the start of every session, just like `CLAUDE.md`.
- **Rules with `paths`** load only when Claude works with matching files, so backend rules cost you nothing during frontend work.

Remember what we said in lesson 15 about AI being like a junior developer. Good rules are what you'd tell one on their first day. Be specific enough that you could check whether it was followed.

Create these four files.

**`.claude/rules/workflow.md`**

```markdown
# Workflow

- Plan before editing, unless it's a small fix.
- Stop and ask before:
  - adding a dependency
  - changing an API URL or response shape
  - changing a model or adding a migration
  - changing, skipping or deleting a test
  - adding anything that wasn't requested
- Reuse existing code before writing new code.
- Don't change files through shell commands when the edit tool can do it, so changes appear as reviewable diffs.
- Only say tests pass after running them. Report failures as they are.
- Ask before committing or pushing.
```

**`.claude/rules/backend.md`**

```markdown
---
paths:
  - "ticketmono_backend/**/*.py"
---

# Backend

- Use DRF ViewSets, serializers and routers, matching `event_tickets`.
- Keep `select_related` and `prefetch_related` on querysets that return related data.
- Set permissions explicitly on every ViewSet, with `permission_classes` or `get_permissions`.
```

**`.claude/rules/frontend.md`**

```markdown
---
paths:
  - "ticketmono_frontend/src/**"
---

# Frontend

- Data flows from `src/api/` to `src/hooks/` to pages. Network calls only happen in `src/api/`, through `apiClient`.
- Server state uses TanStack Query, and query keys include every parameter.
- Every page that loads data handles loading, error and empty states.
- Forms use controlled inputs like `LoginForm`. No form libraries.
- Style with the existing Tailwind and daisyUI classes. No new UI libraries.
```

**`.claude/rules/testing.md`**

```markdown
---
paths:
  - "ticketmono_backend/**/tests.py"
  - "ticketmono_frontend/src/__tests__/**"
  - "ticketmono_frontend/src/test/**"
---

# Testing

- Backend tests use `APITestCase`, shared data in `setUp`, and `force_authenticate`.
- Don't use mocking in backend tests.
- Frontend tests query the way a user finds things, use MSW at the network boundary, and use `renderWithProviders`.
- Keep loading, error and success as separate tests.
- Add a test only when it would catch a different failure from the existing tests. Don't test the same rule twice.
- New behaviour needs a test that would fail without it.
```

These rules are deliberately a starting point. They don't cover everything that can go wrong in lesson 2, and that's on purpose.

**Rules are guidance, not enforcement.** The model reads them and usually follows them, but nothing forces it to. It can drift from them or quietly work around them. That's what the next two steps are for.

---

## Step 7 — Permission Modes and Their Gaps

The mode in the footer of the prompt box decides what Claude can do without asking you. Recent versions of the extension **start in Auto**, so unless you change it, you won't be approving anything.

| Mode | What runs without asking |
|---|---|
| **Auto** | Everything, with a separate model reviewing actions in the background |
| **Manual** | Only reads. It asks before edits and most shell commands, and shows you a diff for edits |
| **Edit automatically** | Reads, edits, and `mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp` and `sed` inside your project |
| **Plan** | Reads. It describes the work and waits for your approval |

**In this course we use Manual, and Plan for planning.** This course is opinionated about this. You should see what's being written while you're still learning what good code looks like.

Auto is genuinely useful once you know what you're doing, and it does block dangerous things like force pushes. But it decides what's safe, and "safe" isn't the same as "correct". It won't stop bad code from being written.

### The Gaps

Approving every edit doesn't mean you've seen every change, because **not every change goes through the edit tool**:

- **Shell commands can change files.** `sed`, scripts, redirects, `makemigrations`, `npm install` and formatters all write to disk. In Manual you approve a command, rather than reviewing a side-by-side diff of what it changes.
- **Edit automatically approves `sed` and `rm`.** Inside your project, those run with no prompt at all.
- **"Yes, and don't ask again" sticks around.** On a shell command, that approval is permanent for this project. On edits, it lasts only for the session. Approve something broad like `python *` and you've quietly removed a lot of future prompts.

**Try it.** Switch to Manual and ask:

```
Use sed to change the "Upcoming Events" heading in EventsListPage.jsx to "All Events".
```

Look at what you're asked to approve, and compare that to a normal edit. Then undo the change.

### The Habit That Covers All of These

```
git diff
```

**Run this before every commit.** It shows every change, no matter how it was made. This is the same workflow we've been using all course, and it's your real safety net.

---

## Step 8 — Add Guardrails with `settings.json`

Unlike `CLAUDE.md` and rules, `settings.json` is enforced by the tool itself, rather than left up to the model.

Create `.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Bash(python manage.py test *)",
      "Bash(coverage run *)",
      "Bash(coverage report *)",
      "Bash(coverage html *)",
      "Bash(npm run test:run *)",
      "Bash(npm run lint *)",
      "PowerShell(python manage.py test *)",
      "PowerShell(coverage run *)",
      "PowerShell(coverage report *)",
      "PowerShell(coverage html *)",
      "PowerShell(npm run test:run *)",
      "PowerShell(npm run lint *)"
    ],
    "ask": [
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(pip install *)",
      "Bash(npm install *)",
      "PowerShell(git commit *)",
      "PowerShell(git push *)",
      "PowerShell(pip install *)",
      "PowerShell(npm install *)"
    ],
    "deny": [
      "Read(./**/.env)",
      "Read(./**/.env.*)"
    ]
  }
}
```

Let's go through this:

- **`defaultMode: default`** starts every session in Manual rather than Auto. `default` is the config name for Manual.
- **`allow`** runs without asking. Running tests is safe and you'll do it constantly, so this saves a lot of prompts.
- **`ask`** always prompts, even in other modes. Committing, pushing and adding packages should be your decision.
- **`deny`** is blocked outright. Rules are checked in the order deny, ask, allow, so a deny always wins.
- **Bash and PowerShell** are both listed because different machines use different shells.

Since this file belongs to the project, committing it gives your whole team the same guardrails. Personal overrides go in `.claude/settings.local.json`, which stays out of git.

**Try it.** Create a fake secret in `ticketmono_backend/.env`:

```
DEMO_SECRET=not-a-real-secret
```

Then ask Claude to read that file and tell you what's in it, and see what happens. Delete the file when you're done.

> **Note:** These aren't a security boundary. A shell rule matches the command text Claude writes, so the same action written differently may not match. Never give an AI tool access to a secret you can't afford to lose, and never point it at a production database. Remember the deleted production database from lesson 15.

---

## Step 9 — Build Your First Skill

A **skill** is a set of instructions that loads when you ask for it. If you've written a Django management command, it's a similar idea: a named task that you run on demand.

| | Loaded | Use it for |
|---|---|---|
| `CLAUDE.md` | Every session | Facts about the project |
| Rules | Every session, or when matching files are touched | Standards to always follow |
| Skills | When invoked | Tasks you repeat |

Create `.claude/skills/run-tests/SKILL.md`:

```markdown
---
description: Runs the backend and frontend tests, with backend coverage, and reports a short summary.
disable-model-invocation: true
---

In `ticketmono_backend`, run `coverage run manage.py test`, `coverage report` and `coverage html`.
In `ticketmono_frontend`, run `npm run test:run`.

Report the pass and fail counts for each, and the backend coverage percentage. For any failure, give the test name and the error only. List the changed backend files with the lowest coverage.

Finish by suggesting we open `ticketmono_backend/htmlcov/index.html` in a browser, giving the path.

Don't change any source files.
```

`disable-model-invocation: true` means only you can run it. Without that line, Claude can decide to run a skill when your request matches its description.

Run it by typing `/run-tests`, then open the coverage report you learned about in the coverage example. Notice that asking for a short summary also keeps long test output out of your context, which is Step 4 paying off.

Don't feel like you need a lot of these. A skill earns its place when you keep typing out the same instructions.

---

## Step 10 — What MCP Is

**MCP (Model Context Protocol)** is a standard way to connect an AI tool to outside systems, such as GitHub, a database, or an issue tracker. Instead of you pasting in an issue, the tool could read it directly.

We won't be setting one up in this class. Two things to keep in mind when you do:

- **You're giving it access.** An MCP server can do what its credentials allow, so treat that like handing over a password.
- **A command line tool is often enough.** For GitHub, Claude can often just use the `gh` command.

---

## Step 11 — Commit Your Setup

Your tooling is part of the project, so it goes through the same workflow as everything else. Create a branch, then commit, push, open a pull request and merge it:

```
git checkout -b add-claude-config
git add CLAUDE.md .claude
git commit -m "Add Claude Code project configuration"
git push --set-upstream origin add-claude-config
```

> **Missed the last class?** Everything you need to create is in Steps 5 to 9.

---

# Lesson 2: Building a Feature

Quick reminder from Step 1: the permission you have to use this on the final project covers **this project**, under its documentation rules. It doesn't carry over to anything else.

## Step 12 — Create the Issue and Branch

None of this part uses AI. Clear requirements are what make the tool useful.

Take a look at the "My events" screen in the organizer mockups from [the planning example](../../module_2_frontend_backend_api_integration/5_1_ticketing_example_introduction_start/images/design_mockups.png) (the bottom row). We're keeping this small on purpose: one screen, built together. Create this issue in your repository:

- **Title:** Organizer My Events screen
- **Label:** enhancement
- **Description:**

```markdown
As an event organizer, I want to see my events and how they're selling so that I can track how they're doing.

## Acceptance criteria
- Only organizers see the My Events navigation link and can open the page; other users are redirected
- The page lists only my events with date, venue, tickets sold and revenue, plus totals for events, tickets sold and revenue
- The page handles loading, error and empty states
- The API enforces this: only organizers can get this data, and they only get their own events
- Backend and frontend tests cover the above

## Out of scope
Creating or editing events, attendees and dashboard screens, and any database changes.
```

Then create your branch, named after your issue number:

```
git checkout main
git pull
git checkout -b <issue-number>-my-events
```

---

## Step 13 — Plan the Feature

We use plan mode for every task. It's where the expensive decisions get made, while they're still cheap to change.

Type `/plan`, then give it the full picture: a few sentences on what you're doing, the whole issue, and the mockup image (you can paste images directly into the prompt box).

**Don't accept the first plan.** Read it from start to finish, then question it. Some things to push on:

- **The mockup shows things the database doesn't have**, like event status and fill rate. The issue rules out database changes. What did the plan do about that?
- **What's the API going to look like?** What URLs, who can call them, what goes in and what comes back?
- **Who's allowed to do what?** Where is that checked?
- **What existing code is it reusing?** Is it adding anything you already have?
- **Why that approach?** Ask it to justify decisions and to give you the alternatives.

Your plan should end up specific enough that you could spot it going off track. Remember that plans can quietly change too: if you ask it to fix step 4, check that step 1 is still what you agreed to.

---

## Step 14 — Build It, Reviewing Every Change

Approve the plan and stay in **Manual** mode. Read each diff before you accept it. If you don't understand something, reject it or ask, because you're responsible for this code once it's in your pull request.

Work in two checkpoints. At each one, run the tests, try it, run `git diff`, and commit.

1. **Backend.** Try the API from Postman logged in as `alice_organizer`, `bob_organizer` and your regular user. Totals will be zero until someone buys tickets, so log in to the app as your regular user and buy some.
2. **My Events page.** Check what each kind of user sees in the browser.

If it starts to spiral, stop it. Use `/rewind`, or `/clear` and try again with a better prompt, rather than arguing with it for twenty minutes.

---

# Lesson 2: Evaluating the Tool

"It seems to work" isn't an evaluation. In this part you're going to find out how well it actually did.

## Step 15 — Run the Tests and Read the Coverage Report

Run `/run-tests`, then open `ticketmono_backend/htmlcov/index.html` in your browser and look at the files you changed. Every red line is code your tests never ran.

Passing tests aren't proof on their own, since the tool wrote those tests too. So check that they'd catch a real problem. Temporarily remove the organizer-only permission from your new endpoint, and run the tests again. **If they still pass, your tests aren't protecting you.** Then put the check back.

Also, take a look at the top of `event_tickets/tests.py`. The existing tests use `role='organizer'`, but the real role in `core/models.py` is `event_organizer`. Did Claude copy that into your new tests? Did it notice?

---

## Step 16 — Build a Review Skill

Create `.claude/skills/review-feature/SKILL.md`:

```markdown
---
description: Runs the tests and reviews the current branch against the plan and rules, filling in the scorecard with evidence.
disable-model-invocation: true
---

In `ticketmono_backend`, run `coverage run manage.py test` and `coverage report`. In `ticketmono_frontend`, run `npm run test:run`.

Then compare `git diff main` against the plan and the rules in `.claude/rules/`.

Give a yes or no, with evidence from the code, for each item:

1. Followed the plan without quiet additions
2. Reused existing code and patterns instead of duplicating
3. Followed the rules
4. Tests pass, new backend code is covered, and tests would fail if the feature broke
5. Security holds at the API: roles and ownership are enforced on the server, not just hidden in the UI
6. Data is right, including edge cases

Point out what you're unsure of rather than guessing. Don't fix anything or change any files; report only.
```

Run `/clear`, then `/review-feature`. Starting fresh matters, since a session that just wrote the code is more inclined to believe it's right. Give it your plan if it needs it.

This gives you a second opinion, not a verdict. The tool is grading its own work, which is why the next step is yours.

---

## Step 17 — Score the Result

Fill this in **yourself**, using what you've seen. Write down your evidence, such as a file, a line, or something you tried.

| # | Question | Yes / No | Evidence |
|---|---|---|---|
| 1 | Did it follow the plan without quiet additions? | | |
| 2 | Did it reuse existing code and patterns instead of duplicating? | | |
| 3 | Did it follow your rules? | | |
| 4 | Do tests pass, is new backend code covered, and would tests fail if the feature broke? | | |
| 5 | Does security hold at the API? Can a regular user get this data? Can Bob see Alice's events? | | |
| 6 | Is the data right, including an event with no sales and tickets sold across several tiers? | | |
| 7 | Could you explain every changed file to a teammate? | | |

For number 5, actually test it. Hiding a link isn't security, so send the request from Postman.

Here are some things that are easy to miss in code like this:

- **Security only in the UI.** The route is protected but the API isn't.
- **A query per row.** Do the totals run a new query for every event?
- **Too much code.** It built something you didn't ask for, or copied something it could have reused.

**Compare with the people around you.** Everyone gave nearly the same instructions, so why are the results different? The same tool won't produce the same code twice.

**Discussion:** `POST /api/v1/auth/register/` accepts a `role` field, even though we left it out in Step 2. What stops anyone from registering as an organizer? What would you do about it?

---

## Step 18 — Turn Every Miss Into a Rule

This is the habit to take away from this example.

For every "no" on your scorecard, ask: **what rule would have prevented this?** Then add it, and make it specific. For example:

- Enforce roles and ownership at the API. Hiding something in the UI isn't security.
- Calculate totals in the database rather than with a query per row.

**Discussion:** Would your new rule have prevented it? Not every miss can be solved by a rule. Some need a permission setting, a test, or just you reading more carefully. Which of yours are like that?

Be careful about adding too many. Every rule without `paths` costs you context on every message, and a long list gets followed less reliably. Keep the rules that have earned their place.

---

## Step 19 — Check Your Usage, Discuss How You Used It, and Open a Pull Request

### Check Your Usage

Run `/usage`. How much did this feature use? What used the most?

### Discuss How You Used It

Talk this through with the people around you. You don't need the exact prompts, just a general picture:

- What did you use the tool for, and what did you decide or do yourself?
- Where did it save you time, and where did it cost you time?
- What would you do differently on your next feature?

### Open a Pull Request

Read through `git diff main` one more time, then commit and push:

```
git add .
git commit -m "Add organizer My Events screen"
git push --set-upstream origin <issue-number>-my-events
```

Open a pull request on GitHub from your branch into `main` and link your issue with `Closes #<issue-number>` in the description. Get a teammate to review it, the same way you've been doing since the code review example. The AI wrote it, but **it's your name on the pull request**.

---

## Challenges/Exercises

### 1. Create Event

Build the "Create event" screen from the mockups, using the whole workflow on your own: issue, branch, plan, reviewed edits, scorecard. Did your new rules help? Here's the issue:

- **Title:** Organizer Create Event screen
- **Label:** enhancement
- **Description:**

```markdown
As an event organizer, I want to create new events with multiple ticket tiers so that I can sell tickets for them.

## Acceptance criteria
- Create Event takes a name, date and time, one of my venues, and one or more ticket tiers (name and price)
- Invalid input shows clear errors, and a failed create saves nothing
- The new event appears in My Events straight away
- The API enforces this: only organizers can create events, and only an event's organizer can change or delete it
- Backend and frontend tests cover the above

## Out of scope
Editing from the UI, venue creation, and any database changes.
```

This one has more traps. Watch for these when you score it:

- **Trusting the request.** Does the organizer come from the login? Can you create an event at someone else's venue?
- **Half-saved data.** The event is saved, then a tier fails, and you're left with an event with no tiers.
- **Stale screens.** You create an event and it's not in the list until you refresh.
- **Times shifting.** You pick 7:30 PM and it displays as something else.

### 2. Fill a Test Gap

Find a line your backend tests never run in the coverage report. Write the test yourself, by hand.

### 3. Apply It to Your Final Project

Write a `CLAUDE.md` and rules for your final project as a team. What's different about them?

---

## Conclusion

Over these two classes you set up an AI coding tool, built a small feature with it, and evaluated the result. Here's what you covered:

- **Policy** — learning these tools isn't permission to use them everywhere; check with your instructor and show your intended workflow
- **Context and caching** — the whole conversation gets sent with every message, so keep context small with `/clear`, `/compact` and specific prompts
- **`CLAUDE.md`** — short project facts that you generate, then edit down
- **Rules** — your team's standards, loaded always or by file path, and your main way of improving how the tool works
- **Permission modes** — what runs without asking, and why approving edits doesn't mean you've seen every change
- **`settings.json`** — guardrails enforced by the tool rather than left to the model
- **Skills** — on-demand instructions for tasks that you repeat
- **MCP** — connecting outside tools, and what you're handing over when you do
- **The workflow** — issue, branch, plan, reviewed edits, tests, `git diff`, pull request
- **Evaluation** — a scorecard with evidence, and turning every miss into a rule

The tools will change quickly, and the names will change with them. What won't change is that you're responsible for what you ship. The reason you learned to write and test this code by hand is so that you can tell when the tool gets it wrong.
