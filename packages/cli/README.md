# exportdou

Official command-line client for ExportDou (https://exportdou.cn).

~~~bash
npx exportdou login
npx exportdou inspect "<Douyin link or share text>"
npx exportdou export "<Douyin link>" --limit 1000 --replies
npx exportdou status "<task-id>" --json
npx exportdou resume "<task-id>" --json
npx exportdou preview "<task-id>" --json
npx exportdou download "<task-id>" --output comments.csv
~~~

Run npx exportdou help for every command and option.

Authentication uses a browser device flow. The resulting key is written to a private local configuration file and can be revoked at https://exportdou.cn/settings/api-keys.
