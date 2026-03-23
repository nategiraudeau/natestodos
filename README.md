# nate's todo_s

simple local todo list

runs locally

built with bun and vite (all typescript)

only runs locally

### what can do:

- write todos

- check off todos

- drag todos around to rearrange

- expand list of done todos, with most recently completed at top

- insert "dividers" between todos...

    example:

    before dividers:

    ```
        - todo for today
        - another todo for today
        - something i can do tomorrow
    ```

    after i put dividers in:

    ```
        **today**
        - todo for today
        - another todo for today

        **tomorrow**
        - something i can do tomorrow
    ```

    when all todos after a divider are checked off the divider disappears (is deleted, not saved in todo history)

- todo history only loads last few todos, but i can click "show more" to get the next few

- to make a todo i just type in text box at the top of the list and hit enter

- to make divider i just type in text box at top but i put a ">" or "> " first and then press enter

- to edit either todo or divider just click on todo text and press enter when done

- while editing, `ctrl + k` (or `cmd + k`) deletes that item entirely

- to mark todo off click circle

- to make done todo undone click checked circle (puts at end of todo list)

### what looks like (for ppl who are blind and can't see):

- there is only one page and no other text on the page besides text for todo list

- text is clean monospace font (google sans code)

- design is minimal

- color scheme is clean solarized look (light or dark)

    (but no toggle for light or dark- just need to enter "cmd + d" to toggle)

### how data stored:

local `todos.txt`:

- `> some label` means divider

- `- some text` means open todo

  - starts with `-`

  - then todo text

- `x some text` means done todo

  - starts with `x`

  - then todo text

- blank lines are ignored (just for readability)

- order in file is order in list

- done todos are ordered by completion action (newly completed gets inserted at top)

### what if parser doesn't like:

- give error

- user needs to be repairman and manually fix

- using through the app should never mess up file

- cant hit enter if todo is empty

- cant hit enter if just ">" - needs text

- when editing a todo, saving it empty deletes that todo

example:

```
> today
- buy eggs
- email sam

> tomorrow
- fix bug in drag

x buy coffee
x call mom
```

#### how built (stack):

- txt file for data

- bun for packages

- vite for build

- react for the thing the user sees

- the writing is mostly:

    - typescript (also tsx if you will)

    - scss

#### build + deploy (local):

- build:

```
bun run build
```

- deploy latest build to running local services:

```
pm2 restart natetodos-api
pm2 restart natetodos-web
pm2 save
```

- app url:

`http://127.0.0.1:4173`
