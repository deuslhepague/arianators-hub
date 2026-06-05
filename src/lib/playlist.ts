// Playlist Generator Logic (Ported from printar3.py)

export const DEFAULT_FOCUS_TRACKS = [
  "https://open.spotify.com/track/20jbSiX29FDX4oQxBXyUEi",
  "https://open.spotify.com/track/3iy2QuCtCzpWnR6tia39AB",
  "https://open.spotify.com/track/3sLsICFrhFhXZlRFb3f2jB",
  "https://open.spotify.com/track/3idrvUQYONMAJ6EgZZqiL8",
  "https://open.spotify.com/track/6flVfBnGgTLZBT1hAt1XfJ"
];

export const DEFAULT_HITS_TRACKS = [
  "https://open.spotify.com/track/51ZQ1vr10ffzbwIjDCwqm4",  // WE CAN'T BE FRIENDS
  "https://open.spotify.com/track/46kspZSY3aKmwQe7O77fCC",  // WE CAN'T BE FRIENDS
  "https://open.spotify.com/track/30TmLgK0ja5O8q9l4BShIX",  // EVERYDAY
  "https://open.spotify.com/track/53SfB4huCgiRGmwzJdEo1u",  // EVERYDAY
  "https://open.spotify.com/track/3UoULw70kMsiVXxW0L3A33",  // POV
  "https://open.spotify.com/track/1bj8x3ERN9gSc2NfJIpc76",  // POV
  "https://open.spotify.com/track/5D34wRmbFS29AjtTOP2QJe",  // YES AND
  "https://open.spotify.com/track/0eanJEFFplPt5ByX33ms63",  // YES AND
  "https://open.spotify.com/track/0Lmbke3KNVFXtoH2mMSHCw",  // THE BOY IS MINE
  "https://open.spotify.com/track/6BEnItYh0j4s7vc8VPpca1",  // THE BOY IS MINE
  "https://open.spotify.com/track/2hloaUoRonYssMuqLCBLTX",  // BLOODLINE
  "https://open.spotify.com/track/5GkQIP5mWPi4KZLLXeuFTT",  // MOTIVE
  "https://open.spotify.com/track/1TEL6MlSSVLSdhOSddidlJ",  // NEEDY
  "https://open.spotify.com/track/0S4RKPbRDA72tvKwVdXQqe",  // THE WAY
];

export const DEFAULT_FILLER_TRACKS = [
  "https://open.spotify.com/track/2pzle6gc8hnsckQdECy2J0",
  "https://open.spotify.com/track/3XD6Tdw9Ur7Znn49spYjSw",
  "https://open.spotify.com/track/7sl2ZOfXHvxvZd1u9TyVQp",
  "https://open.spotify.com/track/59c2SQ2hE8x2JQrrEZs6c6",
  "https://open.spotify.com/track/21L1dVOTGhvAKvBXXnTIHj",
  "https://open.spotify.com/track/4pgwYcEYkIGMTiONM2JMV1",
  "https://open.spotify.com/track/7j7MArN6cotJVlbn5HOQ1t",
  "https://open.spotify.com/track/1wcTYAqzjCqssBtpfyc1wZ",
  "https://open.spotify.com/track/0lyS40L23d9fIlP6IU36XR",
  "https://open.spotify.com/track/5Lp3yhnEHrcsE1BYiT06r8",
  "https://open.spotify.com/track/3i4jlS5TlVjRovgq1ENgaJ",
  "https://open.spotify.com/track/2oIyIjIJL581F6WNkRy1jK",
  "https://open.spotify.com/track/1OTXnoe2AGsDQ3Yp1vxI9s",
  "https://open.spotify.com/track/2zfuuU0KD4fJJMdwi03WSd",
  "https://open.spotify.com/track/3kTXDCEKy0Hdp66Ms8LoE0",
  "https://open.spotify.com/track/6W2LqYDsR9BtAzhcbFj4w0",
  "https://open.spotify.com/track/6WMxH9twwIFfH3OVfs40lA",
  "https://open.spotify.com/track/598AAlVoLJr1zhmToOnmZe",
  "https://open.spotify.com/track/3wFhbnBPM6jWgGpyoma2vg",
  "https://open.spotify.com/track/4mb9nrZ6f04pnfLAP7exmp",
  "https://open.spotify.com/track/0scYtiSe1lZlQt6vqWlcZC",
  "https://open.spotify.com/track/46qNJFJxjDEmAYx7hBtx1k",
  "https://open.spotify.com/track/2FO4bI9MqGN7NQZIr3ROHs",
  "https://open.spotify.com/track/6tmWKd8kKXaYGfhihe5zmp",
  "https://open.spotify.com/track/5OL6fhjeOkUCj0w6rEu2G7",
  "https://open.spotify.com/track/01uB4yJv5jTyfReBpGzcfM",
  "https://open.spotify.com/track/24FB1Xt8CpuuXZJyiMcau1",
  "https://open.spotify.com/track/7I3vnN7JkrJEiTtuoXGKoo",
  "https://open.spotify.com/track/753emEV9LUJ0PPKJj9r5lv",
  "https://open.spotify.com/track/5h2Yjx4DAA75OYtK5mATWd",
  "https://open.spotify.com/track/4GTzXsbs8e63jNs6knU4OO",
  "https://open.spotify.com/track/7h6grPQyH6WEZ3kd0I81uY",
  "https://open.spotify.com/track/3UUz1N3H9Mfvk9Rkww6P4T",
  "https://open.spotify.com/track/14qNe78czFfFI92k8Cnq7i",
  "https://open.spotify.com/track/2QoDA4PQiLA5gZME35my0n",
  "https://open.spotify.com/track/4h7pGYo2Ciay17qYsPXwfL",
  "https://open.spotify.com/track/6pbhDyb2KsbNM6kb7qnoL1",
  "https://open.spotify.com/track/1FRohIRoLhbuPYRDL2i4B7",
  "https://open.spotify.com/track/3G46TV86veZnxkiKsQOQIK",
  "https://open.spotify.com/track/7MKlAAbfKVgNJ4orhhKIV9",
  "https://open.spotify.com/track/1muNlVTMB2vgk0NpOhVkSt",
  "https://open.spotify.com/track/1YcRxJssQ2ecDTBikvGbS3",
  "https://open.spotify.com/track/0bB0Be04RuVLe2y8W1eBqB",
  "https://open.spotify.com/track/6I1iluD72xZcXK9E4BRp25",
  "https://open.spotify.com/track/1nsHEIMiqiPzlwaZu5ykZG",
  "https://open.spotify.com/track/0ax3USmva6tE4Ngk5vWljh",
  "https://open.spotify.com/track/0yce2RnFdx2OhL2v89EfkE",
  "https://open.spotify.com/track/7xrtSOPrFxjyavgkXEZ32U",
  "https://open.spotify.com/track/68Fw8W7vu96pu8179iEUwu",
  "https://open.spotify.com/track/27jvPeF0CzGiIc6luvkQJT",
  "https://open.spotify.com/track/3WnGLAKOeutk6CPmWQ0G2i",
  "https://open.spotify.com/track/2prFnLtNBsDiMLuM6fv29X",
  "https://open.spotify.com/track/2eZ1PfpLUcnWlcUJGfAndN",
  "https://open.spotify.com/track/47av5XimDgohLVFsG1Ehwo",
  "https://open.spotify.com/track/5MeNPT4pLaNIkfPCTkYeQD",
  "https://open.spotify.com/track/1lqA8jK8yKWapWJ8s1tELM",
  "https://open.spotify.com/track/5Rc0ZtPwdP2P8wXTq7EamM",
  "https://open.spotify.com/track/4KgTrzmfiWNcVneh2Dd1Ou",
  "https://open.spotify.com/track/2luGIYeRiZjATscDmUjUXl",
  "https://open.spotify.com/track/7AJjhaE3vuErrtP7QF5WTs",
  "https://open.spotify.com/track/5jKHbb0n6bJK5TAm8IfWgo",
  "https://open.spotify.com/track/06b2BHdNidcgcehnAod836",
  "https://open.spotify.com/track/5PjZ70m5qgb2I2Bz1ZSayt",
  "https://open.spotify.com/track/2XiehPFCfBGbB7vEpQjmxU",
  "https://open.spotify.com/track/4lRrw2uqwTmCfLpkD9r9iN",
  "https://open.spotify.com/track/0HmPzfIGbhDC3Wpowd8kQi",
  "https://open.spotify.com/track/4KB1r2SFtOEK221pPJclKN",
  "https://open.spotify.com/track/49pS6MyxU0BJhfkIBFQMAo",
  "https://open.spotify.com/track/3MZSuXMAMl7rKElDacysk1",
  "https://open.spotify.com/track/2uk0jHh1RrONj7FHQg3frg",
  "https://open.spotify.com/track/3Eh7WGMU8cZMChuv5afcsv",
  "https://open.spotify.com/track/6ULNZ5Gw0JdVL38It7JFcv",
  "https://open.spotify.com/track/1WVunZLZM2zLTm5rAvKZkF",
  "https://open.spotify.com/track/23KTFoSToZT0204ITz9cFi",
  "https://open.spotify.com/track/4QDcjz0V5zwkkQm2TUPE8A",
  "https://open.spotify.com/track/5yF03lkIaM198O6rEDea7I",
  "https://open.spotify.com/track/65E62IKAS6cnO46fpkDhx1",
  "https://open.spotify.com/track/04sMookUVUCkRlgNsbumRm",
  "https://open.spotify.com/track/7f3ZJctvLPoQqRTM9P9fNK",
  "https://open.spotify.com/track/3LAj7jtfvVBcwG9lNmPM92",
  "https://open.spotify.com/track/7tqIKNBfS2sKSd013aOFBE",
  "https://open.spotify.com/track/01991ZHSg5ptvRpMXERVkv",
  "https://open.spotify.com/track/4IIuCotvqijraSdnVLaFnM",
  "https://open.spotify.com/track/3Z5taVHYljiWv6itioRRRw",
  "https://open.spotify.com/track/5jHsGYuqxQ1GLZebOPrKBK",
  "https://open.spotify.com/track/7gmQ329Ocmvb9OImqevFBF",
  "https://open.spotify.com/track/6ICgbsZfwrrPIt6Hi0rZXA",
  "https://open.spotify.com/track/0Qe6Us6taV5fVd3r87dFRP",
  "https://open.spotify.com/track/2NsQ1m0LMCYNiPp2G7HP3U",
  "https://open.spotify.com/track/7cws1zVDiDzcolTAijFWD3",
  "https://open.spotify.com/track/1dpjEzJW2z3xvCXZdA9eME",
  "https://open.spotify.com/track/5fCJmQELxXvDZxKfhxmsGv",
  "https://open.spotify.com/track/7I7UgTSFDr7Ya5pBtXQ7OB",
  "https://open.spotify.com/track/2Uq5ZzTvWY2b3seKqGzk9p",
  "https://open.spotify.com/track/1oJ8dUWkZf3AU5zEh0A8pP",
  "https://open.spotify.com/track/7JS3kMjzL6IxxwoGZD8gW8",
  "https://open.spotify.com/track/1gqS8bomGckIqmfDbavdHD",
  "https://open.spotify.com/track/3BhImmLpDfBNVz3Chfzopd",
  "https://open.spotify.com/track/4wYgjbm4uPsedxFmGSnY3T",
  "https://open.spotify.com/track/2hXH0lq9mfxS8EVFsWOwmW",
  "https://open.spotify.com/track/3UUTUsYZAAAkcWgkoxHvcu",
  "https://open.spotify.com/track/0e554AYzxSBN8hjEsX0kSZ",
  "https://open.spotify.com/track/6TtvH08r8arBddzs8a8ao2",
  "https://open.spotify.com/track/3u8BTavdqT8zZVt5qFDZQo",
  "https://open.spotify.com/track/2Un9T33ttUwnJUHLuaphil",
  "https://open.spotify.com/track/6jypaMkKsoc5npsVzxhksl",
  "https://open.spotify.com/track/4xXjH2OMjlkTWMZDKpAXP2",
  "https://open.spotify.com/track/5m5IUSaiUslyp6UQvmWp6q",
  "https://open.spotify.com/track/2cdNzaQJssaVsm5GKKtnnL",
  "https://open.spotify.com/track/1tzj2vY4twkNmZ5K3DUOPp",
  "https://open.spotify.com/track/0JjXbuxPL1Mq9nLyewhxz2",
  "https://open.spotify.com/track/7Ar9aZno8pK0wVtYkVhOr5",
  "https://open.spotify.com/track/6ZKb3UNC7IvVCtYzT3vS3q",
  "https://open.spotify.com/track/1dgaRzQouUkC1Kti0XjKtl",
  "https://open.spotify.com/track/6YqsIERz8ZznclqMyhNRiu",
  "https://open.spotify.com/track/7n7kFFEr1TowpFZU3hPScI",
  "https://open.spotify.com/track/0JNrQLe1ReAw51oSQw1Xd5",
  "https://open.spotify.com/track/7pZctJLpMEzvnpEQaMw0YA",
  "https://open.spotify.com/track/4u7Nj9WHdCsBRvijDKNeXx",
  "https://open.spotify.com/track/2KdT8BSu7sViL2G5vQiWB6",
  "https://open.spotify.com/track/6YyMbzAUPJLaGcldbEKmXB",
  "https://open.spotify.com/track/3NIVIvs6bInQCVXQfB5l9d",
  "https://open.spotify.com/track/4eYlbg0eWqcT9MNSA5SkcE",
  "https://open.spotify.com/track/0oQc0F6KUE7QY7k5TU6bic",
  "https://open.spotify.com/track/4ZM7BHMTbtUiA1ENVVpSjA",
  "https://open.spotify.com/track/65AQMfBU0ffGDPUoeQdj5G",
  "https://open.spotify.com/track/6GZlV0GfKVzFZ8JkS9yxbN",
  "https://open.spotify.com/track/750vrdXpq7sPGsYW7zTOor",
  "https://open.spotify.com/track/484Ze4X20ujEewo6JZwGGb",
  "https://open.spotify.com/track/49Gw4oU4GZmMUytaeVY0xh",
  "https://open.spotify.com/track/5sz00JY0sDJHdK6R2x3BRM",
  "https://open.spotify.com/track/20xsKf2fj7pgKi4Tmwkr8u",
  "https://open.spotify.com/track/3EfKP2xSbM9Yqbd6fkNgxf",
  "https://open.spotify.com/track/7uydTQfTvmUqLhZN4l5jkA",
  "https://open.spotify.com/track/1UVd5ttWkFSd8HDVr17Eq2",
  "https://open.spotify.com/track/5HQiu07zg3KIFMGvbAiW5t",
  "https://open.spotify.com/track/4Ly25NhyZ1Jp4M3E8I6E5J",
  "https://open.spotify.com/track/1SBA2DX3a07iOqlzUTJ3Wr",
  "https://open.spotify.com/track/4Q4bdzrVDetTU9xDT3YLeH",
  "https://open.spotify.com/track/1WTZzfJRL0WAOTPLOI4aoE",
  "https://open.spotify.com/track/0fJ1caLzidzTlIL3pPX1eU",
  "https://open.spotify.com/track/5GpVtfhrDs9fOa0o56oWWh",
  "https://open.spotify.com/track/0vLrkHnqxCjeEV5JXEDqN0",
  "https://open.spotify.com/track/3cVGz4AzXYBJSQz4zGy8F8",
  "https://open.spotify.com/track/6yX11XqvshWi3Z2E8V24FO",
  "https://open.spotify.com/track/6OsxOEM68UaFqmoItLqrNm",
  "https://open.spotify.com/track/7KiYULFWzrO8gIRAJHqOht",
  "https://open.spotify.com/track/1Gep9a3yUiMzjb3FbmbWx2",
  "https://open.spotify.com/track/7knBrnogZb9deMQuQy8rhf",
  "https://open.spotify.com/track/1RMvRv1tAvWXgYdH8DUdLX",
  "https://open.spotify.com/track/6BWHgZ2sO1gXt8p0jgYOqA",
  "https://open.spotify.com/track/7cIatrGJJc4pzCigmlS27N",
  "https://open.spotify.com/track/3gNflNTgjSYYX8r9n0fKss",
  "https://open.spotify.com/track/2sICm130sYjgrFrgrfV1n0",
  "https://open.spotify.com/track/0CjX1qnje7Yo7HgeF3Y7sB",
  "https://open.spotify.com/track/1yQb5qyHJuep94lOZdGI7C",
  "https://open.spotify.com/track/49kajcVcOSNQVx3TEEGRCf",
  "https://open.spotify.com/track/24bxijgwUt0atHxfpHsH5A",
  "https://open.spotify.com/track/26lLb2IUxrsuCfjVpQ7jsX",
  "https://open.spotify.com/track/7vapxYOQOWiqqmgjsyQpvp",
  "https://open.spotify.com/track/2rOEuIcKr4QZzPXxspvOr3",
  "https://open.spotify.com/track/4JaqygglHv9rWW6B2NfgF6",
  "https://open.spotify.com/track/7oGFmPGaF5txE4cjL4HyR4",
  "https://open.spotify.com/track/1aZ13be3m7q63iCQVPSl3a",
  "https://open.spotify.com/track/4wNNshQFNaTkXFl6TOIBlZ",
  "https://open.spotify.com/track/3YVh0Cii8p9VuBNI9MKhia",
  "https://open.spotify.com/track/0GAE689kVy7sFT2QWZH1Xa",
  "https://open.spotify.com/track/3VVEUP5550SmFMQkjIlZ7f",
  "https://open.spotify.com/track/1Fhf8YdCdcteR9teySB3HE",
  "https://open.spotify.com/track/1HQnSuonOEwozJ9NhkRYEr",
  "https://open.spotify.com/track/3lmaQKFyO1bV54jE9hkOwG",
  "https://open.spotify.com/track/3tejkj4UdTiC1IjXn4FHnb",
  "https://open.spotify.com/track/041BrDKQ68NUkP2xIUGirK",
  "https://open.spotify.com/track/6m3nTuawD2KNZLeWWhEEu4",
  "https://open.spotify.com/track/2EzzkjZt4ciGn49AeEylo3",
  "https://open.spotify.com/track/4PBrSY2yQO4ImaHUIkGxRr",
  "https://open.spotify.com/track/7dNiAWgoo3TwAl1fkWdSmB",
  "https://open.spotify.com/track/3EYDZ99D1QHq2QoBBjJu22",
  "https://open.spotify.com/track/2yjWj03sh7W7Qwnhd0zThP",
  "https://open.spotify.com/track/4q9MKihkS7mttSqpF6gvg3",
  "https://open.spotify.com/track/4CcGESvl2sietfzjgqzXKH",
  "https://open.spotify.com/track/2CK4lM5fyynAAr7wTge0Bx",
  "https://open.spotify.com/track/2ECStT4KZ41nvCaoNAcpnQ",
  "https://open.spotify.com/track/47ngDLArw7JjcuIWvCvAg8",
  "https://open.spotify.com/track/5H455XTlzkfIf85tvxqja3",
  "https://open.spotify.com/track/55naQIBi91MXi44q79y8TJ",
  "https://open.spotify.com/track/02g0GEqJRyO0ENm8uk5vMi",
  "https://open.spotify.com/track/2ziiXmYJzLDndCavJiKc4n",
  "https://open.spotify.com/track/7tlAWur1RNnqWbuoL5qWqG",
  "https://open.spotify.com/track/0VKmZof6ORlRSayclx1zdw",
  "https://open.spotify.com/track/4EZaBtybTiXvtcTBQpCsF2",
  "https://open.spotify.com/track/046mU05ZfQ383gXwRK8K72",
  "https://open.spotify.com/track/6rTqYkpXwKMv8sBvWB6Fl4",
  "https://open.spotify.com/track/1tlfh7RSe2T39byWWM8J2L",
  "https://open.spotify.com/track/604vF3VjgOZhLKHyGkARjn",
  "https://open.spotify.com/track/0irbhXYHwYTUmeuYSzTTld",
  "https://open.spotify.com/track/68d4UMngVJYzKzATkXKVcw",
  "https://open.spotify.com/track/4B6YmlUT19hGfTcDLUUFZ7",
  "https://open.spotify.com/track/13IgO5G6ZBk7mXAhEWBwyO",
  "https://open.spotify.com/track/7df8J6qn9KB6EdnsaBjbHq",
  "https://open.spotify.com/track/4mrqjAl9Bj4xMFxjdbgq9P",
  "https://open.spotify.com/track/5ahfs52RplXSO7bdc5cdDb",
  "https://open.spotify.com/track/4tFxr1o5zeN9r5EXXeF6XH",
  "https://open.spotify.com/track/2dv2DYn0V0j0Wx6Ra40bce",
  "https://open.spotify.com/track/1tnln5ONuQWC8gqZzq8XRQ",
  "https://open.spotify.com/track/3KqXhVELZxC5e2bgrUhVyD",
  "https://open.spotify.com/track/76OC0zMt7wqgys9BpPfLag",
  "https://open.spotify.com/track/3xSBmY1xktXuzWLQjpd3Nq",
  "https://open.spotify.com/track/5YTozGjDIKbuXOXnhEnLZm",
  "https://open.spotify.com/track/0Ytf40sbSHd0LMcxm8Yjfm",
  "https://open.spotify.com/track/2llFSBEhgQKlz5D4QVP8Fk",
  "https://open.spotify.com/track/7HAowsGkbWLcoZf23x3iiJ",
  "https://open.spotify.com/track/50teLoQu9W7CTO6hm0fBF0",
  "https://open.spotify.com/track/2EmihuJbmXOcfN3QafNIkJ",
  "https://open.spotify.com/track/50uTyr246OnCNk9GfQDD7r",
  "https://open.spotify.com/track/0bZvYnydvLfu0vVYnPGawA",
  "https://open.spotify.com/track/6X9gBTFXe12lnhwTmVBIYl",
  "https://open.spotify.com/track/1pAc5EH2qeq7SKyH9dlZEA",
  "https://open.spotify.com/track/5PLx1QYcAviGL9rfD179IX",
  "https://open.spotify.com/track/37SmOdTEr8wjvDpddcnrLS",
  "https://open.spotify.com/track/4a6fLRXmH4R4dMu9c1MzE6",
  "https://open.spotify.com/track/3dqbN2Ed7MNAJG5T3n4fll",
  "https://open.spotify.com/track/7pkqvejfDmeLen9MrnppQr",
  "https://open.spotify.com/track/4rCuwgRRKaIiHlHDc8Bga6",
  "https://open.spotify.com/track/4bS1Nhedu5un0Jr3YOdJzk",
  "https://open.spotify.com/track/1KHbWUgH57d8HRz5xZIIWQ",
  "https://open.spotify.com/track/1dJ4xCkQTKAxpJWAGoUZL7",
  "https://open.spotify.com/track/5aoxZ43627uUo0bYpovN7Y",
  "https://open.spotify.com/track/6BJk4mUPkZUD2UyhazIF17",
  "https://open.spotify.com/track/46Ykbossnav7MND8qCJcGR",
  "https://open.spotify.com/track/3WTqeZ8PowUWaoBFV7wRW6",
  "https://open.spotify.com/track/7r1dM74v7FpoXahyUan5ZB",
  "https://open.spotify.com/track/69YtbnALqh0dhXeyJe1WO0",
  "https://open.spotify.com/track/1OR7Zl1Sf2YLwAXyUya0Wj",
  "https://open.spotify.com/track/7EG3kXbKmNC1OismTn6ZG5",
  "https://open.spotify.com/track/1bBY01q1I7hziu59ZVEm39",
  "https://open.spotify.com/track/486YUqcmF9IWPkreU0THcQ",
  "https://open.spotify.com/track/5pDF3eASVkgWBb8yIDojGW",
  "https://open.spotify.com/track/7f1WsI5NSG5bc3AwwubIko",
  "https://open.spotify.com/track/38g59jnDK4VACXY5vGM3P6",
  "https://open.spotify.com/track/3VjvkFWR7tOZL04uNDu5EX",
  "https://open.spotify.com/track/6sIZFWgScdBoCzEuo3H4pE",
  "https://open.spotify.com/track/4trVv57BVPaVe9EjNOCUGL",
  "https://open.spotify.com/track/3gCralqpe9SKfGH3yoYtWE",
  "https://open.spotify.com/track/3dkSLrqzIFCVL7fPBXGgT3",
  "https://open.spotify.com/track/0JAwIy1W8HLKcyb9GheNJu",
  "https://open.spotify.com/track/1TQCMEos6Hx3thNdPQKuEz",
  "https://open.spotify.com/track/2rt3HXWCxp32VUMEYrnLLp",
  "https://open.spotify.com/track/5AO3FFFW6o333KWUbcG4AD",
  "https://open.spotify.com/track/5jrKKMBBaMCFZZ4kXTLV38",
  "https://open.spotify.com/track/5SkmujpDr4CG8Yau63GGNh",
  "https://open.spotify.com/track/79chzfFIIq7cHkqcYYORk0",
  "https://open.spotify.com/track/0TY3mG1wn8XIIPp5iF5joM",
  "https://open.spotify.com/track/58l7Gd0Cn0IOKFziVJhSev",
  "https://open.spotify.com/track/0gFnnxM4M81C75K53OnrqY",
  "https://open.spotify.com/track/38cxPonZ8DehreKbDEGctW",
  "https://open.spotify.com/track/2p9nPXumGKnftitKgbeJ0f",
  "https://open.spotify.com/track/6QWTyT3x3CMoxk25D7bqKP",
  "https://open.spotify.com/track/20vVKQWGDgHte5msuPC37m",
  "https://open.spotify.com/track/4SQqO9SJXGTruFedgQM63V",
  "https://open.spotify.com/track/7A0vienIYYw4CT0VnIy63K",
  "https://open.spotify.com/track/4Z3SbDSif85n3iCq0pohGD",
  "https://open.spotify.com/track/1CksaD6yzBqKFXR2ZYRpcs",
  "https://open.spotify.com/track/19SkaKsk0nizUd1BGz64dP",
  "https://open.spotify.com/track/3wjNabi8OaDNKoyXkl7fS2",
  "https://open.spotify.com/track/5UsBlmT3HUt2jklJ7JlHku",
  "https://open.spotify.com/track/4XoCdr4ndhxaXYx7hXPow9",
  "https://open.spotify.com/track/2fLfobBrRNolLyE3J5xcOG",
  "https://open.spotify.com/track/6ZgUTCrKgFkIsobRRoroFr",
  "https://open.spotify.com/track/2cvFLZPAQoGeQnIRPt2LHE",
  "https://open.spotify.com/track/57bFywVxO4H85rhhHKkOEy",
  "https://open.spotify.com/track/2sBfaDCXXJccj0sSJo5hln",
  "https://open.spotify.com/track/6GEiVJ9JYMjgQvyB8ptdtx",
  "https://open.spotify.com/track/0n6qoCWeQuMfSVDDOF1RSE",
  "https://open.spotify.com/track/2lAx5MME9gzQMhb644yYYL",
  "https://open.spotify.com/track/19wOgi2BJk8F08qYmPWLvZ",
  "https://open.spotify.com/track/224mbTVsTmZnkqff3s1Hqb",
  "https://open.spotify.com/track/6OXecAdjGsHoIlQPlXgQBq",
  "https://open.spotify.com/track/46Owd2cCEtjsTHizeBqMfP",
  "https://open.spotify.com/track/1uVoEVmDUOSPJamg5r0znQ",
  "https://open.spotify.com/track/05JtBVWRtSzqLoj7jj30kn",
  "https://open.spotify.com/track/3tGenBRNrF6lmIhGFnst0X",
  "https://open.spotify.com/track/425mJO91gIMWMwEIDCCs1H",
  "https://open.spotify.com/track/01IevIrKdGz3HGUwwWZBDq",
  "https://open.spotify.com/track/3oam5EmL7KFDD8tGr37jDK",
  "https://open.spotify.com/track/6nmGiqhRFsRGWM6jbbQbVQ",
  "https://open.spotify.com/track/2X5m6irq8boS50Efx4oWew",
  "https://open.spotify.com/track/0pYFIQ7pRkqQ1wfyjmcUaF",
  "https://open.spotify.com/track/4JW0fVwTpAKII93XIhSQSI",
  "https://open.spotify.com/track/1KLBtRrrzKLChLF2sxJxXV",
  "https://open.spotify.com/track/2avsFkimGMYsOI28R6zqGB",
  "https://open.spotify.com/track/4PBYAb62xN4OxsQKTtFNZM",
  "https://open.spotify.com/track/7yLRY4RtCnY0l82BzTw5fA",
  "https://open.spotify.com/track/0lhDiOviH4xmzyYeOsn01M",
  "https://open.spotify.com/track/1BvomQcVidSDKCndZdBEv3",
  "https://open.spotify.com/track/7IAAKbsurRicMy7SLPHv7n",
  "https://open.spotify.com/track/3smeAsX16M88aQwhtj0sHM",
  "https://open.spotify.com/track/3gDHYGdjP2IgsYl52xP8OT",
  "https://open.spotify.com/track/6pLlQE4Ypn9zQBCe16UskF",
  "https://open.spotify.com/track/1ehr8egbO3uHJoxQCbI9OE",
  "https://open.spotify.com/track/31uN5FqfJYubT9t7vqZRiE",
  "https://open.spotify.com/track/7pc7BbxSFFCUf0h5bFpx96",
  "https://open.spotify.com/track/5re1KJAlBesD4z1TP97krb",
  "https://open.spotify.com/track/0ykEerg9t8HNkpztSXmxM0",
  "https://open.spotify.com/track/7peLgnKZLsDE3gp5CthWpp",
  "https://open.spotify.com/track/76h2we9cSZdz326VpLQCaS",
  "https://open.spotify.com/track/4gX335ixsKIqE7Gpigzf1d",
  "https://open.spotify.com/track/3zwDNvpgwwcC7Hu3HDDvA4",
  "https://open.spotify.com/track/7ftvJvDCJKjXiDRal6O12q",
  "https://open.spotify.com/track/2KNDnsIVY43RwJ3rCpKPO5",
  "https://open.spotify.com/track/702UOn4Z1h5fTD6oItbX1Q",
  "https://open.spotify.com/track/0rrniOiy14jzhsUk2iBxwP",
  "https://open.spotify.com/track/3CGZ7wfk4skmuyQgua1C1K",
  "https://open.spotify.com/track/4pgO4CAp3kj9n5kTN1BqXt",
  "https://open.spotify.com/track/0jdI2PmzYM9neGpK4AtYkx",
  "https://open.spotify.com/track/2vjLwE4tfgPpGczDbyhRJB",
  "https://open.spotify.com/track/3iW3y326xuRpNVXzOMBZy5",
  "https://open.spotify.com/track/5vk5RElQHgElxD3jlRI9IY",
  "https://open.spotify.com/track/4ZITTb2LVX8l84P1BLqs4z",
  "https://open.spotify.com/track/2mtPh005xkipPu8WtXCHRq",
  "https://open.spotify.com/track/46LduK8OnEO7uK5ShfdSLu",
  "https://open.spotify.com/track/2WBsWIKEvgXVVEKJtTF7Fh",
  "https://open.spotify.com/track/4nFyj33yk6Odq4zUWpbfXz",
  "https://open.spotify.com/track/1YdB3YDhJRZZBBr3lslNyC",
  "https://open.spotify.com/track/1xAysPpMb04U2nVuqVO1PF",
  "https://open.spotify.com/track/5D01rNYxlGRweNylNlU8I7",
  "https://open.spotify.com/track/5d4Qhq6PfU30fooeIpAZjp",
  "https://open.spotify.com/track/1oKwUy4DRaPxBU23J50bJe",
  "https://open.spotify.com/track/4Asr6KMnA9rjtAXtyo0MSY"
];

export const DEFAULT_SHORT_TRACKS = [
  "https://open.spotify.com/track/0v2LUO8oTHnkjQ8MmKuXyk",
  "https://open.spotify.com/track/1rNNOKF4kiaNmdkpIKNsvd",
  "https://open.spotify.com/track/0go0Gvkh1a57FMud7h1SXd",
  "https://open.spotify.com/track/5582hkL6JqgbxHncoEcQH1",
  "https://open.spotify.com/track/1UqsvjSTQuMSqt76ypDu2O",
  "https://open.spotify.com/track/3TZzy5oBF3JQ7U1iZtfN5v",
  "https://open.spotify.com/track/6L7GbQdXMqXsQwr7TOU3II",
  "https://open.spotify.com/track/13jRSCLoWbCoU1XEdJRbgn",
  "https://open.spotify.com/track/37xSCULPsOwbtlrfXxWNyo",
  "https://open.spotify.com/track/2mYPirWWFiRaMAdAwxYrmf",
  "https://open.spotify.com/track/0X5CV5S0wv4BipEwvfjvLx",
  "https://open.spotify.com/track/4WGWurl6AGL4hXlTJqaMxH",
  "https://open.spotify.com/track/4IFuro2gb8AdhJ4OOucPS5",
  "https://open.spotify.com/track/77AjPYlh1EHaxel15niq77",
  "https://open.spotify.com/track/5SyCD1ic378B4rYWhDmuvo",
  "https://open.spotify.com/track/6KfO5tEll4owFUX2vbFcVG",
  "https://open.spotify.com/track/2RD9V9Yzn6CF1HizEqAXlR",
  "https://open.spotify.com/track/6Q9AAmKg7qAs2ub41PoQOX",
  "https://open.spotify.com/track/4QgH3GXHnHuxMJu3RG69Hg",
  "https://open.spotify.com/track/0XOnMqLQDO89iAg7dWWwnG",
  "https://open.spotify.com/track/02Qo5DFgoGTiBGo4ZUvjXm",
  "https://open.spotify.com/track/59NnZFsjW255ZRUzIcUQ0q",
  "https://open.spotify.com/track/3Os1431WclqyKxWqMzRESE",
  "https://open.spotify.com/track/1djLdPkMQCbF1iENkeqXJG",
  "https://open.spotify.com/track/0qMNPhpRzbghJy6G3SgRag",
  "https://open.spotify.com/track/250DatjHReXuQxl6ZZw4dR",
  "https://open.spotify.com/track/1DfZFyeOTqcrveRLJD2psY",
  "https://open.spotify.com/track/68qmliinx2gvsiqjX5boxN",
  "https://open.spotify.com/track/0LlAdQc4Vd7wqqbdtKJmQR",
  "https://open.spotify.com/track/2PJ2ojJW47MmoVRTxCCbm4",
  "https://open.spotify.com/track/3uJxoARz4pN9EOV1Rk7lUT",
  "https://open.spotify.com/track/5h4Nb77ApXkgLhhJcVBMmC",
  "https://open.spotify.com/track/7mlFkC6UHIl1nfelFBkq4L",
  "https://open.spotify.com/track/2o1pb13quMReXZqE7jWsgq",
  "https://open.spotify.com/track/7EhJMeBeptBfJh8kkjZXjw",
  "https://open.spotify.com/track/7xTbVQSuLpM1SRIKMcaPCI",
  "https://open.spotify.com/track/0gaVjEkiHwK26V4miuNymq",
  "https://open.spotify.com/track/1WY6fZHFmq7eHS0pzDKSZe",
  "https://open.spotify.com/track/54RvpknjZr7nnjO5q6UwVJ",
  "https://open.spotify.com/track/56noeoUB3KB5APkN6nvhY0",
  "https://open.spotify.com/track/7LtqaCjLaiSvSdYgFQyYEM",
  "https://open.spotify.com/track/5rz6BhAIYq45Iw94xQRSJe",
  "https://open.spotify.com/track/5sN008Na95Ct8lfpsYAPrm",
  "https://open.spotify.com/track/2KawmvuMvEZvoYLSblxNnm",
  "https://open.spotify.com/track/22o3uPkOYSa85wRbrznDH1",
  "https://open.spotify.com/track/7MjS7SoRzn8VXajFdV3t04",
  "https://open.spotify.com/track/3HUJw4KvL5baIwuh0wWPoh",
  "https://open.spotify.com/track/7zrhy9OhtcO7MdIvbbJiOa",
  "https://open.spotify.com/track/6nx2z3uGS0LhvRor8LpoIb",
  "https://open.spotify.com/track/2r3gfGANsuPbAwmLWGv0ET",
  "https://open.spotify.com/track/1gCC4V2iW0juUv4jaDABsp",
  "https://open.spotify.com/track/3eZYOQO4UzKrUDYDghtnFw",
  "https://open.spotify.com/track/5NjM6bLa4GdmjjDrUJt0yr",
  "https://open.spotify.com/track/0NE9m9pW3Lg4rGhASc9SvN",
  "https://open.spotify.com/track/6KIKaWKE9wV6mLjho3w61y",
  "https://open.spotify.com/track/5hixQFzlu1sabD6p3kiS7v",
  "https://open.spotify.com/track/63WsFFnQ8CL941iZBELYsX",
  "https://open.spotify.com/track/2uL48Qwc88pu7S9JjT6Jvv",
  "https://open.spotify.com/track/1RNjLHCiT562LKqKNYIlMi",
  "https://open.spotify.com/track/1whfVLMKWqAX3uk97VXsNN",
  "https://open.spotify.com/track/5ctjuy2gyXUxr6DxUa2O1B",
  "https://open.spotify.com/track/7cFYqReKEigTxTm0bNE6YA",
];

// Helper to extract Spotify Track ID from URL
export function extractTrackId(url: string): string {
  const parts = url.split("/track/");
  if (parts.length > 1) {
    return parts[1].split("?")[0];
  }
  return url;
}

// Convert URL to URI: "spotify:track:ID"
export function convertToUri(url: string): string {
  const id = extractTrackId(url);
  return `spotify:track:${id}`;
}

export interface PlaylistConfig {
  tabela1: string[]; // Focus
  tabela2: string[]; // Hits
  tabela3: string[]; // Fillers (Noise/Interludes)
  tabela4: string[]; // Shorts (Ariana shorts)
  repetirCadaMusica: number;
  qtdTabela1: number;
  qtdTabela2: number;
  qtdTabela3: number;
  qtdTabela4: number;
  tabelaPrincipal: number; // 1 to 4
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function gerarPlaylistMesclada(config: PlaylistConfig): string[] {
  const {
    tabela1: raw1,
    tabela2: raw2,
    tabela3: raw3,
    tabela4: raw4,
    repetirCadaMusica = 20,
    qtdTabela1 = 2,
    qtdTabela2 = 1,
    qtdTabela3 = 1,
    qtdTabela4 = 1,
    tabelaPrincipal = 1,
  } = config;

  // Convert URLs to Spotify URIs
  const trackUris1 = raw1.map(convertToUri);
  const trackUris2 = raw2.map(convertToUri);
  const trackUris3 = shuffleArray(raw3.map(convertToUri));
  const trackUris4 = raw4.map(convertToUri);

  // Multiply lists as done in printar3.py: tabelax = tabelax * repetir_cada_musica
  // In JS: repeat array N times
  const repeatArray = <T>(arr: T[], times: number): T[] => {
    if (!arr || arr.length === 0) return [];
    let result: T[] = [];
    for (let i = 0; i < times; i++) {
      result = result.concat(arr);
    }
    return result;
  };

  const t1 = repeatArray(trackUris1, repetirCadaMusica);
  const t2 = repeatArray(trackUris2, repetirCadaMusica);
  const t3 = repeatArray(trackUris3, repetirCadaMusica);
  const t4 = repeatArray(trackUris4, repetirCadaMusica);

  const resultado: string[] = [];
  let i1 = 0, i2 = 0, i3 = 0, i4 = 0;

  // Condition to check if the principal table still has songs
  const principalTemMusicas = (): boolean => {
    if (tabelaPrincipal === 1) return i1 < t1.length;
    if (tabelaPrincipal === 2) return i2 < t2.length;
    if (tabelaPrincipal === 3) return i3 < t3.length;
    if (tabelaPrincipal === 4) return i4 < t4.length;
    return false;
  };

  // Main Loop
  while (principalTemMusicas()) {
    // TABELA 1
    for (let count = 0; count < qtdTabela1; count++) {
      if (i1 < t1.length) {
        resultado.push(t1[i1]);
        i1++;
      }
    }

    // TABELA 2
    for (let count = 0; count < qtdTabela2; count++) {
      if (i2 < t2.length) {
        resultado.push(t2[i2]);
        i2++;
      }
    }

    // TABELA 3
    for (let count = 0; count < qtdTabela3; count++) {
      if (i3 < t3.length) {
        resultado.push(t3[i3]);
        i3++;
      }
    }

    // TABELA 4
    for (let count = 0; count < qtdTabela4; count++) {
      if (i4 < t4.length) {
        resultado.push(t4[i4]);
        i4++;
      }
    }
  }

  return resultado;
}
