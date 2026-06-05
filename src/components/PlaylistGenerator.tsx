"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  DEFAULT_FILLER_TRACKS,
  DEFAULT_SHORT_TRACKS,
  gerarPlaylistMesclada,
  PlaylistConfig
} from "@/lib/playlist";
import { Music, Settings, HelpCircle, Copy, Search, Trash2, Plus, RefreshCw, ExternalLink } from "lucide-react";

interface FocusTrackOption {
  id: string;
  name: string;
  versions: string[];
}


interface HitTrackDefinition {
  id: string;
  name: string;
  versions: string[];
}

const DATABASE_HITS: HitTrackDefinition[] = [
  {
    id: "bloodline",
    name: "bloodline",
    versions: [
      "https://open.spotify.com/track/2hloaUoRonYssMuqLCBLTX"
    ]
  },
  {
    id: "boyfriend",
    name: "boyfriend",
    versions: [
      "https://open.spotify.com/track/0Ryd8975WihbObpp5cPW1t",
      "https://open.spotify.com/track/7mUTNN05gzFc7SAzknnljS",
      "https://open.spotify.com/track/1ZkcapijnjbeUxibnGKyzK",
      "https://open.spotify.com/track/6QOMLzvvVQTHt8iGghSrwW",
      "https://open.spotify.com/track/30JH8AIqIflvbBtE69YCRD"
    ]
  },
  {
    id: "break-free",
    name: "break free",
    versions: [
      "https://open.spotify.com/track/1T7Htpf1kEvU9Adf8J0ekk",
      "https://open.spotify.com/track/12KUFSHFgT0XCoiSlvdQi4",
      "https://open.spotify.com/track/3rWbIR3rJIT0Rpu3iR9ZXg",
      "https://open.spotify.com/track/4E8KoNTXZnWDE3cCjjw8FU",
      "https://open.spotify.com/track/7cvxrDu7VIhVSOFRNgPegv",
      "https://open.spotify.com/track/1X2Zd5wKGbY1oKzb8dzJRy",
      "https://open.spotify.com/track/3emCzvUm5FsQnofdNQL73a",
      "https://open.spotify.com/track/67NbegQzVSnoa9wYgknJ51",
      "https://open.spotify.com/track/27OptODVTqmWExaqxhq2PA",
      "https://open.spotify.com/track/1ptAuvUJc1xmxNq6dHEGE2",
      "https://open.spotify.com/track/7qQKhhQkLGxDKeF0EY2uH6",
      "https://open.spotify.com/track/0jeK7B6dUDfSb8F9fZW6XP",
      "https://open.spotify.com/track/2lOgTEwxmRPBtjp60opyRN",
      "https://open.spotify.com/track/6JRIuym0te7m7DYsUuoq9c",
      "https://open.spotify.com/track/4BvSrJ7b5ospPeHmPXqYfR"
    ]
  },
  {
    id: "break-your-heart-right-back",
    name: "break your heart right back",
    versions: [
      "https://open.spotify.com/track/3TNnaCW0kIqtKYVBgZd16b",
      "https://open.spotify.com/track/0HGcQDbRen8luCnwH53sNl",
      "https://open.spotify.com/track/0ZrOMGpPyxmQDknWbfxPms",
      "https://open.spotify.com/track/26gXVZqHG3AThfmkXLlp3P",
      "https://open.spotify.com/track/1VtHucEi71PAhakmffKcm2",
      "https://open.spotify.com/track/77z03u7x2Ie3VBl2ynwYfU",
      "https://open.spotify.com/track/5aQpuASoQgP4fbdCzAxT4f",
      "https://open.spotify.com/track/0bWO4JRjzAr69MQmL6HHXl",
      "https://open.spotify.com/track/6c3pfmQuMdji3cMTEixOg2",
      "https://open.spotify.com/track/50TJobiTvboJbFoSykLsYF"
    ]
  },
  {
    id: "breathin",
    name: "breathin",
    versions: [
      "https://open.spotify.com/track/4OafepJy2teCjYJbvFE60J",
      "https://open.spotify.com/track/4vlnIIEJCooktVkmXtpjgZ",
      "https://open.spotify.com/track/3f4a8DoQR2oKVBVG1CeCgu",
      "https://open.spotify.com/track/3BdcIkBtuwqbThPynHwqV9",
      "https://open.spotify.com/track/0giXEouvVn5NhGGJ9nkuV4",
      "https://open.spotify.com/track/5o2Hob94x5yHzbj6Z3hKsy",
      "https://open.spotify.com/track/49KJ1TX9Zbz0VeJShpAWY4",
      "https://open.spotify.com/track/3tRo4zVbax8SHssqcspQmP"
    ]
  },
  {
    id: "dangerous-woman",
    name: "dangerous woman",
    versions: [
      "https://open.spotify.com/track/6T506SFlFUVVNvnmCiVZR0",
      "https://open.spotify.com/track/2pWZZZGURB0k1R38CP8ouq",
      "https://open.spotify.com/track/7l94dyN2hX9c6wWcZQuOGJ",
      "https://open.spotify.com/track/2h1IPjP471JJRSShTHRUhi",
      "https://open.spotify.com/track/2W0Y7S3RZ0S5B3X4Ve4Qfl",
      "https://open.spotify.com/track/0odJ7WQIdFkA73QFDybe4o",
      "https://open.spotify.com/track/3CbXAECaKyI7qFSsNiI1Fi",
      "https://open.spotify.com/track/3vYdddWMLObkzVX96enuCi",
      "https://open.spotify.com/track/1ZANBLJ4pow8yBrFN9EGFF",
      "https://open.spotify.com/track/5nthg9VhYPcR50lm6mW9KR",
      "https://open.spotify.com/track/18F7XPZe3VCJLXgDmoY6pl",
      "https://open.spotify.com/track/6RUhbFEhrvGISaQ8u2j2JN",
      "https://open.spotify.com/track/3nef5W8jTkXrOKgCu4kmq7",
      "https://open.spotify.com/track/6tNKoXxPKSOnYp36HvFDsm",
      "https://open.spotify.com/track/1OhstguCoBQ4SXT8ugSmOl",
      "https://open.spotify.com/track/75r7vEkbrXYvRf8AQz4FPp",
      "https://open.spotify.com/track/5EZWzEWmjVl6Eqn3tOSA2g"
    ]
  },
  {
    id: "everyday",
    name: "everyday",
    versions: [
      "https://open.spotify.com/track/6yL2kTsdVwYnGwPkKGtMd5",
      "https://open.spotify.com/track/3FiE2d325mIOc4YjkSLVJR",
      "https://open.spotify.com/track/5Nw3felo0tpegd006uvcjv",
      "https://open.spotify.com/track/5f5sAPx2hJG1Oebkk8S5jA",
      "https://open.spotify.com/track/4RJTTrZqPFWaWACVXHkvjw",
      "https://open.spotify.com/track/30TmLgK0ja5O8q9l4BShIX",
      "https://open.spotify.com/track/53SfB4huCgiRGmwzJdEo1u",
      "https://open.spotify.com/track/6sIH0FirGNhuhSjC07Z4KO",
      "https://open.spotify.com/track/1CbwwcXkWbUhc6E3V0Bcl5",
      "https://open.spotify.com/track/6HIhoGreZDLQtfmAdrhY60",
      "https://open.spotify.com/track/0sGPJOpsQs7K2OwxSPMmxf",
      "https://open.spotify.com/track/4VBCPBcohmreZGjGTfL3VS",
      "https://open.spotify.com/track/3pBA0EQ4VRqcD1QrPssXY8",
      "https://open.spotify.com/track/28OUThncuwdC6uasRvZd9w",
      "https://open.spotify.com/track/48EcXKgaFwDWsHsGZcBjsN",
      "https://open.spotify.com/track/6CTOLKEgIU8OtWLCbcjhSQ",
      "https://open.spotify.com/track/3KcaqPxpPP6TYJ7HcJhkxn",
      "https://open.spotify.com/track/0shRr8pBQRBcuE0UxLxg8A",
      "https://open.spotify.com/track/2tMByQa6qGxHc8Ccqtxpsm",
      "https://open.spotify.com/track/6vexUkmlmn0ojqcsxEOEph"
    ]
  },
  {
    id: "focus",
    name: "focus",
    versions: [
      "https://open.spotify.com/track/3IyeQMpMEqNcEvFQGJ2eps",
      "https://open.spotify.com/track/1cdzfFjEbUbgTm5nv3FgXR",
      "https://open.spotify.com/track/4r4V1wYecTxSAAXV11cFPD",
      "https://open.spotify.com/track/5feEm9WwsdmI9Lpd656XFg",
      "https://open.spotify.com/track/00zdKOrr0V91bwalvhjFOH",
      "https://open.spotify.com/track/3T1Ti8npAQCXzxy0zsv05g"
    ]
  },
  {
    id: "god-is-a-woman",
    name: "god is a woman",
    versions: [
      "https://open.spotify.com/track/7gkWXbAxIYuvtOpcN3p9GJ",
      "https://open.spotify.com/track/5OCJzvD7sykQEKHH7qAC3C",
      "https://open.spotify.com/track/0DOe3Bfu8BJkBY9TaVLqG7",
      "https://open.spotify.com/track/1ChPiAIS5RGNUQY4ohyfXG",
      "https://open.spotify.com/track/6TeRR3VusTi9CytrcffoBy",
      "https://open.spotify.com/track/62LspbNqpCV7hDFnWC935c",
      "https://open.spotify.com/track/1XNv8cwpdvFoqkupf5acFJ",
      "https://open.spotify.com/track/0QXs2sDZzs6VpIVRUcf1pT",
      "https://open.spotify.com/track/5yRoyW1Kri0cZ0tsp3BK0k",
      "https://open.spotify.com/track/2TFnKx1y4NFOI55VtiIhpv",
      "https://open.spotify.com/track/54EilpvF17dOXVD1JkZuj2",
      "https://open.spotify.com/track/6mcftKRh17DSO2ySDtxaMn",
      "https://open.spotify.com/track/0YinKgy0pCj3YPKUGWmTOG"
    ]
  },
  {
    id: "hate-that-i-made-you",
    name: "hate that i made you",
    versions: [
      "https://open.spotify.com/track/20jbSiX29FDX4oQxBXyUEi",
      "https://open.spotify.com/track/3iy2QuCtCzpWnR6tia39AB",
      "https://open.spotify.com/track/6flVfBnGgTLZBT1hAt1XfJ",
      "https://open.spotify.com/track/3sLsICFrhFhXZlRFb3f2jB",
      "https://open.spotify.com/track/3idrvUQYONMAJ6EgZZqiL8"
    ]
  },
  {
    id: "into-you",
    name: "into you",
    versions: [
      "https://open.spotify.com/track/3AnwddQhBCSDUwlvbRGyDA",
      "https://open.spotify.com/track/1Oj6gVTwhWYXngPgU8oznO",
      "https://open.spotify.com/track/63y6xWR4gXz7bnUGOk8iI6",
      "https://open.spotify.com/track/5kbzrk1p3d056KYOU41QDh",
      "https://open.spotify.com/track/76FZM38RC8XaAjJ77CVTNe",
      "https://open.spotify.com/track/49gRYU6hBWgSH2JVixGkJq",
      "https://open.spotify.com/track/2jCbLUgE3x4QBCwl0I75aI",
      "https://open.spotify.com/track/2meEiZKWkiN28gITzFwQo5",
      "https://open.spotify.com/track/7yHEDfrJNd0zWOfXwydNH0",
      "https://open.spotify.com/track/0qFe7aHhcRUd1zslwQaxfK",
      "https://open.spotify.com/track/1TSV7cxRh9r3yayGmXjbWQ",
      "https://open.spotify.com/track/239XCXr8DQl18IUNBow8Kg",
      "https://open.spotify.com/track/7woND3TZisiEyZY6HQr0Zr",
      "https://open.spotify.com/track/4cHgU6PIcI88fxLsgaAnxe",
      "https://open.spotify.com/track/6y3bJ52O0Q0y1fWoda9vr6",
      "https://open.spotify.com/track/4Bsd7hSLYvqaZFRyaWiw1E",
      "https://open.spotify.com/track/73u1ip4mDThhjg0I8AmR2V"
    ]
  },
  {
    id: "motive",
    name: "motive",
    versions: [
      "https://open.spotify.com/track/5GkQIP5mWPi4KZLLXeuFTT",
      "https://open.spotify.com/track/5VipERQ1ofCowecoFg2MVU"
    ]
  },
  {
    id: "needy",
    name: "needy",
    versions: [
      "https://open.spotify.com/track/1TEL6MlSSVLSdhOSddidlJ"
    ]
  },
  {
    id: "no-tears-left-to-cry",
    name: "no tears left to cry",
    versions: [
      "https://open.spotify.com/track/5SxkdsY1ufZzoq9iXceLw9",
      "https://open.spotify.com/track/2qT1uLXPVPzGgFOx4jtEuo",
      "https://open.spotify.com/track/4wZqeCVR3fwS5MFoRtAnia",
      "https://open.spotify.com/track/0SQIUoCxtaKpEYK0C5jJSw",
      "https://open.spotify.com/track/5t1P3j6QsGSRboEAh7iKPs",
      "https://open.spotify.com/track/7xGb10s2tLKnxts5Qvjsxc",
      "https://open.spotify.com/track/3DKoTepCVkJWmDBxaaut9K",
      "https://open.spotify.com/track/5OHzcrehvHTM9NmfBTtI7E",
      "https://open.spotify.com/track/62o5MymhGSxLRkkl4J5bg9",
      "https://open.spotify.com/track/7pPHTXwceyvHGi8gq9lHjw",
      "https://open.spotify.com/track/25PHdxgFSVkUZUIjHKYrcd",
      "https://open.spotify.com/track/4fQJZHD9bsujEVklrVbSyp",
      "https://open.spotify.com/track/0DCSLoYfU1mQQRrt02zJ1y",
      "https://open.spotify.com/track/5tCg7VlKpnu1x6hhGMv8vY",
      "https://open.spotify.com/track/448BA4t8DkOwpI4m0AGNcs",
      "https://open.spotify.com/track/5CMFjP1EXIXuklu6FqMB5Q",
      "https://open.spotify.com/track/0PYR25CUYDh8gRqqSgQdmL",
      "https://open.spotify.com/track/6PkvUxuSE8CSg4eoHrYJ3a",
      "https://open.spotify.com/track/61i9rpDx4GbSK8oDxxRkSJ",
      "https://open.spotify.com/track/1xhNo9xtrUJbesF1h9q3Mm",
      "https://open.spotify.com/track/7I4edp6VbQOO6xAO7hqfRg",
      "https://open.spotify.com/track/4H7x4r7cdhYNhqup0UWzQG",
      "https://open.spotify.com/track/1W6et5Tjtx9uh0bsuk4y1X"
    ]
  },
  {
    id: "pov",
    name: "pov",
    versions: [
      "https://open.spotify.com/track/3UoULw70kMsiVXxW0L3A33",
      "https://open.spotify.com/track/1bj8x3ERN9gSc2NfJIpc76"
    ]
  },
  {
    id: "right-there",
    name: "right there",
    versions: [
      "https://open.spotify.com/track/47rzxY9wSpomHE1gT94jIT",
      "https://open.spotify.com/track/5XERnExSpyhv8EsBXqiNZH",
      "https://open.spotify.com/track/3cP38o90yiPd1iDJqhZdrh",
      "https://open.spotify.com/track/263fxTPXeKsdhMIZX025mp",
      "https://open.spotify.com/track/2bpUJcHzDrLRawwufMjzco",
      "https://open.spotify.com/track/5aKqhRdBmC5Qp2c3oek9ft",
      "https://open.spotify.com/track/397NPRgCSB7wXEES2jGaGs",
      "https://open.spotify.com/track/32HZLeNIUPIDK2Jsuur6Om",
      "https://open.spotify.com/track/5tbaE8MQWtqupvLhWSKKdY",
      "https://open.spotify.com/track/2ECMb59WkYhIuscAvsxmBQ",
      "https://open.spotify.com/track/0fzuGMwVSwno9I418pVF0Z",
      "https://open.spotify.com/track/3sjkW3u8Pukuy3XrXJYDM2",
      "https://open.spotify.com/track/3C6LuEyjUEJdR7S6suIy2H",
      "https://open.spotify.com/track/0S3wuGJsiUcw13ylFlDfdQ",
      "https://open.spotify.com/track/7okzKF5m9e0Td5quTyiX7Y",
      "https://open.spotify.com/track/0TNaFBB18qBFvNoav90QpG",
      "https://open.spotify.com/track/7MOjWsk7TVL8dH1yDEmuXG"
    ]
  },
  {
    id: "supernatural",
    name: "supernatural",
    versions: [
      "https://open.spotify.com/track/5V7rdUyypIWQ1T52gRfY44",
      "https://open.spotify.com/track/0CkLGBnqvctknGTyzMiB6P",
      "https://open.spotify.com/track/5Tfrr45yeatPJJts3NkOBS",
      "https://open.spotify.com/track/142PiXzA84lmEw2RstFHFa",
      "https://open.spotify.com/track/2wlV2CzmVGT4Vq45iSRaRZ",
      "https://open.spotify.com/track/11e1AzbdIqyX6VSn13GtSu",
      "https://open.spotify.com/track/5QuRhUOONzlfEE30sRlFXA",
      "https://open.spotify.com/track/1MrnFWBjQCaaeOc7dhR8Bc",
      "https://open.spotify.com/track/30eYVvVYrXwVKNCyZ9HpPg",
      "https://open.spotify.com/track/74IYuITQDAvDyqvV7eiclw",
      "https://open.spotify.com/track/04jvNAcBr8bRhex4Ek0305",
      "https://open.spotify.com/track/6ckwLnqxeNqahEXMpxojrz",
      "https://open.spotify.com/track/6YAtUKOJSYaMXC8wRbWbIe",
      "https://open.spotify.com/track/4p8QVpCGLuaoGGmoKww9wI"
    ]
  },
  {
    id: "thank-u-next",
    name: "thank u next",
    versions: [
      "https://open.spotify.com/track/2rPE9A1vEgShuZxxzR2tZH",
      "https://open.spotify.com/track/3e9HZxeyfWwjeyPAMmWSSQ",
      "https://open.spotify.com/track/2aFdiVqfBC556E7bdscyhV",
      "https://open.spotify.com/track/2fPuNLVmfjo0aT2Aj5IyLy"
    ]
  },
  {
    id: "the-boy-is-mine",
    name: "the boy is mine",
    versions: [
      "https://open.spotify.com/track/0Lmbke3KNVFXtoH2mMSHCw",
      "https://open.spotify.com/track/19nGr45kS0vRbuWeEnarRW",
      "https://open.spotify.com/track/4wZWAStC9iUk5VvtiYgwzV",
      "https://open.spotify.com/track/38JweSPC9JTirnqgFOchCM",
      "https://open.spotify.com/track/46ss5XTo2UVPp1rfFTBQRl",
      "https://open.spotify.com/track/4TYhQPffPcde8OQFnTo62a",
      "https://open.spotify.com/track/6BCYN7KVMyemXqt1jrm4vU",
      "https://open.spotify.com/track/11L8PIO0UF7UiTKYCmO8YI",
      "https://open.spotify.com/track/6BEnItYh0j4s7vc8VPpca1",
      "https://open.spotify.com/track/6eo6zP9NN1XvdVsJpow4JK",
      "https://open.spotify.com/track/59mCYbP5mcOn7vIgHshRPv",
      "https://open.spotify.com/track/1YgdJR2P0YFiQnHJBNYvfc",
      "https://open.spotify.com/track/6VF6nvDUvbOM1Oxn7Ep9E8",
      "https://open.spotify.com/track/5hBBEkAnq2ahuS4TeG7HiR",
      "https://open.spotify.com/track/55jP8VMOi8DA8JFbM5OZFh",
      "https://open.spotify.com/track/2DM0Er3ieA76L3PDEHddgq",
      "https://open.spotify.com/track/6Npsj0VUSvG0VGFNucWhkt"
    ]
  },
  {
    id: "the-way",
    name: "the way",
    versions: [
      "https://open.spotify.com/track/0S4RKPbRDA72tvKwVdXQqe"
    ]
  },
  {
    id: "twilight-zone",
    name: "twilight zone",
    versions: [
      "https://open.spotify.com/track/1UrwJzlNC2oaTlxj1OZmcu",
      "https://open.spotify.com/track/1edcyazKIdKrIuz9cWpXU6",
      "https://open.spotify.com/track/3tl9CDeTF1UnRciYtVd318",
      "https://open.spotify.com/track/1YRbAonLvmuUILvQso0gUM",
      "https://open.spotify.com/track/6gMfPLdXzwvkNajVAycWPB",
      "https://open.spotify.com/track/7w29n5e358oXKoOgwI4NX2",
      "https://open.spotify.com/track/0NE9m9pW3Lg4rGhASc9SvN"
    ]
  },
  {
    id: "we-can-t-be-friends",
    name: "we can't be friends",
    versions: [
      "https://open.spotify.com/track/51ZQ1vr10ffzbwIjDCwqm4",
      "https://open.spotify.com/track/46kspZSY3aKmwQe7O77fCC",
      "https://open.spotify.com/track/3nH6JdYvrM7cnLT7xMrEKX",
      "https://open.spotify.com/track/0sxhuHohfBiqizpDECzTBq",
      "https://open.spotify.com/track/6Y318KtQcizvWEI1cJhNiN",
      "https://open.spotify.com/track/7Bhjc8LPyEZWoxcGu6JTGZ",
      "https://open.spotify.com/track/6FcKs2bVkEDRKZUF0szYgM",
      "https://open.spotify.com/track/3zSnPhuucEb9JbFSxKVcIn",
      "https://open.spotify.com/track/76863BhUI5LIGy6Lv1C3tq",
      "https://open.spotify.com/track/0eJby3xIvMhXJaAfZKhffc",
      "https://open.spotify.com/track/3viiL8U8H510lXkHlH3IwX",
      "https://open.spotify.com/track/4K7EWfdIXAcojdtX933bxF",
      "https://open.spotify.com/track/4pnVB9ImhREdU7aeqGwZFX",
      "https://open.spotify.com/track/6wJe5hdmrc2Lm0F7koD7YT",
      "https://open.spotify.com/track/1M0slHualYxchAYqrIOxUx"
    ]
  },
  {
    id: "yes-and-",
    name: "yes, and?",
    versions: [
      "https://open.spotify.com/track/0ttw2K5qNwaKse9LJQBaQt",
      "https://open.spotify.com/track/3JWzwvBe0kZ2pD2ldDD5Sh",
      "https://open.spotify.com/track/6VFMpSq7A5tAn0JrM7sP27",
      "https://open.spotify.com/track/44ctOf8yy88ud6k2EZqBJO",
      "https://open.spotify.com/track/5qG8BG2CG1yRdtxvn8t5ts",
      "https://open.spotify.com/track/3c17gOvw3hV6bVGngEyW2F",
      "https://open.spotify.com/track/7gaA3wERFkFkgivjwbSvkG",
      "https://open.spotify.com/track/3Ex1Gd9g0b9Gk2hGxvlFQn",
      "https://open.spotify.com/track/2ckw25vIQjnbN03XRwp55B",
      "https://open.spotify.com/track/5D34wRmbFS29AjtTOP2QJe",
      "https://open.spotify.com/track/5Hqo6dHSTPilabNfzZ3MyP",
      "https://open.spotify.com/track/74EQXvUUmicEZB0OcsAKVi",
      "https://open.spotify.com/track/6nbhsQvuur92jIm8MNy7OS",
      "https://open.spotify.com/track/0eanJEFFplPt5ByX33ms63",
      "https://open.spotify.com/track/3plwq2QtBCBp9KD4bChlIe",
      "https://open.spotify.com/track/4T8VTPhmIazj4cZ52B2dAT",
      "https://open.spotify.com/track/6NXNPdQEguHjSH7PcKn1ZQ",
      "https://open.spotify.com/track/1VaOPhMmCDaTbu9ETOjQcr",
      "https://open.spotify.com/track/1PWtQcmhVK7pVpWB1fZY0z",
      "https://open.spotify.com/track/0APmATBiC2CULW3YiKPwlH"
    ]
  }
];

export default function PlaylistGenerator() {
  const { user, token, login } = useSpotify();
  const { language, t } = useLanguage();
  const { theme } = useTheme();

  // Helper to determine initial focus track ID
  const getInitialFocusId = (): string => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("arianator_active_focus_track_id");
      if (stored && DATABASE_HITS.some(hit => hit.id === stored)) {
        return stored;
      }
    }
    return "hate-that-i-made-you";
  };

  // Selection states
  const [selectedFocusId, setSelectedFocusId] = useState<string>(getInitialFocusId);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>(() => {
    const initialFocus = getInitialFocusId();
    const defaults = ["everyday", "pov", "yes-and-", "the-boy-is-mine", "breathin"];
    return defaults.filter(id => id !== initialFocus);
  });
  const [hitVersionLimits, setHitVersionLimits] = useState<Record<string, number>>(() => {
    const initialFocus = getInitialFocusId();
    const limits: Record<string, number> = {
      "everyday": 2,
      "pov": 2,
      "yes-and-": 2,
      "the-boy-is-mine": 2,
      "breathin": 2,
    };
    if (initialFocus in limits) {
      delete limits[initialFocus];
    }
    return limits;
  });
  const [hitSearchQuery, setHitSearchQuery] = useState<string>("");

  // Playlist Configuration State
  const [repetitions, setRepetitions] = useState(20);
  const [focusQty, setFocusQty] = useState(2);
  const [hitsQty, setHitsQty] = useState(1);
  const [fillersQty, setFillersQty] = useState(2);
  const [shortsQty, setShortsQty] = useState(1);
  const [primaryTable, setPrimaryTable] = useState(1); // 1 = Focus Track, 2 = Hits, etc.

  const [playlistName, setPlaylistName] = useState("eternal sunshine stream playlist");
  const [playlistDesc, setPlaylistDesc] = useState("optimized ariana grande stream playlist with interludes and alternative versions. generated via stream hub.");

  // Generator output states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracksList, setGeneratedTracksList] = useState<string[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stepMsg, setStepMsg] = useState("");

  // Retrieve selected Focus track object
  const activeFocusTrack = useMemo(() => {
    return DATABASE_HITS.find(f => f.id === selectedFocusId) || DATABASE_HITS[0];
  }, [selectedFocusId]);

  // Listen to admin focus track changes from localStorage
  useEffect(() => {
    const handleStorageUpdate = () => {
      const stored = localStorage.getItem("arianator_active_focus_track_id");
      if (stored && DATABASE_HITS.some(hit => hit.id === stored)) {
        setSelectedFocusId(stored);
      }
    };
    window.addEventListener("storage_admin_update", handleStorageUpdate);
    handleStorageUpdate();
    return () => {
      window.removeEventListener("storage_admin_update", handleStorageUpdate);
    };
  }, []);

  // If the focus track is changed, make sure it is removed from selectedHitIds
  useEffect(() => {
    if (selectedHitIds.includes(selectedFocusId)) {
      setSelectedHitIds(prev => prev.filter(id => id !== selectedFocusId));
      setHitVersionLimits(prev => {
        const next = { ...prev };
        delete next[selectedFocusId];
        return next;
      });
    }
  }, [selectedFocusId, selectedHitIds]);

  // Filter hits based on search query
  const searchResults = useMemo(() => {
    if (!hitSearchQuery.trim()) return [];
    const query = hitSearchQuery.toLowerCase();
    return DATABASE_HITS.filter(
      hit => hit.name.toLowerCase().includes(query) &&
        !selectedHitIds.includes(hit.id) &&
        hit.id !== selectedFocusId
    );
  }, [hitSearchQuery, selectedHitIds, selectedFocusId]);

  const addHit = (id: string) => {
    if (!selectedHitIds.includes(id)) {
      setSelectedHitIds(prev => [...prev, id]);
      const hitDef = DATABASE_HITS.find(h => h.id === id);
      if (hitDef) {
        setHitVersionLimits(prev => ({
          ...prev,
          [id]: hitDef.versions.length
        }));
      }
    }
    setHitSearchQuery("");
  };

  const removeHit = (id: string) => {
    setSelectedHitIds(prev => prev.filter(item => item !== id));
    setHitVersionLimits(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getTabela2Tracks = (): string[] => {
    return DATABASE_HITS
      .filter(h => selectedHitIds.includes(h.id))
      .flatMap(h => {
        const limit = hitVersionLimits[h.id] !== undefined ? hitVersionLimits[h.id] : h.versions.length;
        return h.versions.slice(0, limit);
      });
  };

  const generateLocalSequence = (): string[] => {
    const config: PlaylistConfig = {
      tabela1: activeFocusTrack.versions,
      tabela2: getTabela2Tracks(),
      tabela3: DEFAULT_FILLER_TRACKS,
      tabela4: DEFAULT_SHORT_TRACKS,
      repetirCadaMusica: repetitions,
      qtdTabela1: focusQty,
      qtdTabela2: hitsQty,
      qtdTabela3: fillersQty,
      qtdTabela4: shortsQty,
      tabelaPrincipal: primaryTable,
    };

    return gerarPlaylistMesclada(config);
  };

  const handleGenerateLocal = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGeneratedUrl(null);

    try {
      const tracks = generateLocalSequence();
      if (tracks.length === 0) {
        throw new Error(
          language === "pt"
            ? "a configuração atual gera uma playlist vazia. selecione ao menos 1 hit se a quantidade de hits for maior que zero."
            : "the current configuration generates an empty playlist. make sure you have selected at least one hit if hits qty > 0."
        );
      }
      setGeneratedTracksList(tracks);
      setSuccessMsg(
        language === "pt"
          ? `sequência da playlist gerada com sucesso (${tracks.length} faixas). veja a lista abaixo!`
          : `generated playlist sequence of ${tracks.length} tracks successfully. scroll down to see the tracks!`
      );
    } catch (err: any) {
      setErrorMsg(err.message || "failed to generate playlist.");
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedTracksList.length === 0) return;

    const urlList = generatedTracksList.map(uri => {
      const id = uri.split(":track:")[1];
      return `https://open.spotify.com/track/${id}`;
    }).join("\n");

    navigator.clipboard.writeText(urlList);
    setSuccessMsg(language === "pt" ? "links das faixas copiados para a área de transferência!" : "copied all track links to clipboard!");
  };



  return (
    <section className="glass-panel p-6 lg:p-10 space-y-8 animate-fade-in text-floral-fg" id="generator">
      <div className={`flex items-center gap-4 border-b pb-6 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
        <div className={`p-3 rounded border ${theme === "light" ? "bg-neutral-100 border-neutral-200 text-black" : "bg-neutral-900 border-neutral-800 text-white"}`}>
          <Music className="w-8 h-8" />
        </div>
        <div>
          <h2 className={`text-2xl md:text-3xl font-bold tracking-wider uppercase ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
            {t("generator.title")}
          </h2>
          <p className={`text-sm mt-1.5 font-mono ${theme === "light" ? "text-neutral-600" : "text-neutral-450"}`}>
            {t("generator.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: Track Pools Configuration */}
        <div className="lg:col-span-2 space-y-8">

          {/* 1. SELECT FOCUS TRACK */}
          <div className={`border p-6 rounded space-y-4 ${theme === "light" ? "bg-white border-neutral-200 text-neutral-900" : "bg-wine-dark/40 border-panel-border text-white"}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold uppercase tracking-wider ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "tabela 1: música foco" : "1. focus track"}
              </h3>
              <span className={`text-xs font-mono ${theme === "light" ? "text-neutral-500" : "text-neutral-400"}`}>
                {language === "pt" ? "meta ativa" : "active target"}
              </span>
            </div>

            <p className={`text-sm ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>
              {language === "pt"
                ? "selecione a música principal que deseja focar. o gerador rotacionará todas as edições e lançamentos de álbuns alternativos para respeitar o limite de plays por versão."
                : "select the main track you want to stream. the generator rotates all available alternate album releases and editions to satisfy the 20-plays limit."}
            </p>

            <select
              value={selectedFocusId}
              onChange={(e) => setSelectedFocusId(e.target.value)}
              className={`w-full border rounded px-3 py-3 text-base focus:outline-none cursor-pointer font-serif ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950 focus:border-black" : "bg-neutral-950 border-neutral-900 text-white focus:border-white"}`}
            >
              {DATABASE_HITS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.versions.length} {language === "pt" ? "versões" : "versions"})
                </option>
              ))}
            </select>

            <div className={`text-xs space-y-1.5 p-4 rounded border font-mono max-h-36 overflow-y-auto ${theme === "light" ? "bg-neutral-50 border-neutral-200 text-neutral-600" : "bg-neutral-950/60 border-neutral-900 text-neutral-400"}`}>
              {activeFocusTrack.versions.map((url, i) => (
                <div key={i} className="truncate">{i + 1}: {url}</div>
              ))}
            </div>
          </div>

          {/* 2. SUPPORTING HITS LIST & SEARCH */}
          <div className={`border p-6 rounded space-y-6 ${theme === "light" ? "bg-white border-neutral-200 text-neutral-900" : "bg-wine-dark/40 border-panel-border text-white"}`}>
            <div>
              <h3 className={`text-base font-bold uppercase tracking-wider mb-1.5 ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "tabela 2: hits de apoio" : "2. supporting hits"}
              </h3>
              <p className={`text-sm ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>
                {language === "pt"
                  ? "busque e selecione outras músicas da ariana grande para tocar entre as faixas principais."
                  : "search and select other ariana grande songs to play between the focus tracks."}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={hitSearchQuery}
                onChange={(e) => setHitSearchQuery(e.target.value)}
                placeholder={
                  language === "pt"
                    ? "buscar hits no banco de dados... (ex: everyday, pov, needy)"
                    : "search database hits to add... (e.g. everyday, pov, needy)"
                }
                className={`w-full pl-10 pr-4 py-2.5 border rounded text-sm focus:outline-none font-serif ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950 focus:border-black placeholder-neutral-400" : "bg-neutral-950 border-neutral-900 text-white focus:border-white placeholder-neutral-600"}`}
              />

              {/* Search dropdown results */}
              {searchResults.length > 0 && (
                <div className={`absolute left-0 right-0 mt-2 border rounded shadow-2xl max-h-48 overflow-y-auto z-30 divide-y ${theme === "light" ? "bg-white border-neutral-200 divide-neutral-100" : "bg-neutral-950 border-neutral-800 divide-neutral-900"}`}>
                  {searchResults.map((hit) => (
                    <button
                      key={hit.id}
                      onClick={() => addHit(hit.id)}
                      className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center cursor-pointer font-serif transition-colors ${theme === "light" ? "text-neutral-800 hover:bg-neutral-100 hover:text-black" : "text-neutral-200 hover:bg-neutral-900 hover:text-white"}`}
                    >
                      <span>{hit.name}</span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500 font-mono">
                        <Plus className="w-3.5 h-3.5" /> {language === "pt" ? "adicionar" : "add"} ({hit.versions.length}v)
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Hits Chips / List */}
            <div className="space-y-3.5">
              <span className={`block text-xs font-bold uppercase ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "hits de apoio ativos:" : "active supporting hits:"}
              </span>
              {selectedHitIds.length === 0 ? (
                <div className={`text-center py-6 border border-dashed rounded text-sm ${theme === "light" ? "border-neutral-300 text-neutral-500" : "border-neutral-850 text-neutral-400"}`}>
                  {language === "pt"
                    ? "nenhum hit de apoio selecionado. busque e adicione acima."
                    : "no supporting hits selected. search and add some above."}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedHitIds.map(hitId => {
                    const hitDef = DATABASE_HITS.find(h => h.id === hitId);
                    if (!hitDef) return null;
                    return (
                      <div
                        key={hitId}
                        className={`flex flex-wrap items-center gap-3 px-3 py-1.5 border rounded text-xs font-semibold font-mono ${theme === "light" ? "bg-neutral-50 border-neutral-200 text-neutral-800" : "bg-neutral-950 border-neutral-900 text-white"}`}
                      >
                        <span className="truncate max-w-[150px] sm:max-w-[200px]" title={hitDef.name}>
                          {hitDef.name}
                        </span>
                        <div className="flex items-center gap-1 border-l pl-2 border-neutral-350 dark:border-neutral-800">
                          <span className={`text-[10px] uppercase font-bold ${theme === "light" ? "text-neutral-400" : "text-neutral-500"}`}>
                            {language === "pt" ? "versões:" : "versions:"}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={hitDef.versions.length}
                            value={hitVersionLimits[hitId] ?? hitDef.versions.length}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(hitDef.versions.length, parseInt(e.target.value) || 1));
                              setHitVersionLimits(prev => ({
                                ...prev,
                                [hitId]: val
                              }));
                            }}
                            className={`w-10 text-center rounded border focus:outline-none focus:border-white font-mono text-xs ${theme === "light"
                              ? "bg-white border-neutral-350 text-black focus:border-black"
                              : "bg-neutral-900 border-neutral-800 text-white"
                              }`}
                          />
                          <span className={`text-[10px] ${theme === "light" ? "text-neutral-400" : "text-neutral-500"}`}>
                            / {hitDef.versions.length}
                          </span>
                        </div>
                        <button
                          onClick={() => removeHit(hitId)}
                          className={`transition-colors cursor-pointer ml-1 p-0.5 rounded ${theme === "light" ? "text-neutral-400 hover:text-black" : "text-neutral-500 hover:text-white"}`}
                          title="remove track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`text-xs pt-4 border-t flex justify-between font-mono ${theme === "light" ? "border-neutral-200 text-neutral-600" : "border-neutral-900/60 text-neutral-400"}`}>
              <span>{language === "pt" ? "músicas de apoio no mix:" : "supporting tracks loaded in mix:"}</span>
              <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-white"}`}>{getTabela2Tracks().length} slots</span>
            </div>
          </div>

          {/* 3. FILLERS & SHORTS DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`border p-5 rounded ${theme === "light" ? "bg-white border-neutral-200 text-neutral-900" : "bg-wine-dark/40 border-panel-border text-white"}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "tabela 3: interlúdios (fillers)" : "3. filler tracks"}
              </h3>
              <p className={`text-xs leading-relaxed font-mono ${theme === "light" ? "text-neutral-600" : "text-neutral-450"}`}>
                {language === "pt"
                  ? `utiliza ${DEFAULT_FILLER_TRACKS.length} interlúdios de outros artistas para otimizar streams.`
                  : `utilizes ${DEFAULT_FILLER_TRACKS.length} non-ariana interludes to optimize streams.`}
              </p>
            </div>
            <div className={`border p-5 rounded ${theme === "light" ? "bg-white border-neutral-200 text-neutral-900" : "bg-wine-dark/40 border-panel-border text-white"}`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "músicas curtas" : "4. short tracks"}
              </h3>
              <p className={`text-xs leading-relaxed font-mono ${theme === "light" ? "text-neutral-600" : "text-neutral-450"}`}>
                {language === "pt"
                  ? `utiliza ${DEFAULT_SHORT_TRACKS.length} faixas curtas de apoio da ariana (menos de 2 minutos e meio) para transições.`
                  : `utilizes ${DEFAULT_SHORT_TRACKS.length} short ariana tracks (under 2 minutes and a half) to complete cycle transitions.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Mix & Loop Algorithm Parameters */}
        <div className={`border p-6 rounded space-y-6 ${theme === "light" ? "bg-neutral-50 border-neutral-200 text-neutral-900" : "bg-neutral-950/60 border-panel-border text-white"}`}>
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-4 ${theme === "light" ? "text-neutral-950 border-neutral-200" : "text-white border-panel-border"}`}>
            <Settings className="w-5 h-5" />
            {language === "pt" ? "parâmetros de mix" : "mixing parameters"}
          </h3>

          <div className="space-y-5 text-sm font-mono">
            <div>
              <label className={`block text-xs font-bold uppercase mb-2 ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "repetições (cada versão)" : "repetitions (each version)"}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={repetitions}
                onChange={(e) => setRepetitions(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className={`w-full border rounded px-3 py-2.5 text-sm focus:outline-none ${theme === "light" ? "bg-white border-neutral-350 text-neutral-950 focus:border-black" : "bg-neutral-900 border-neutral-850 text-white focus:border-white"}`}
              />
              <span className={`text-xs mt-1 block ${theme === "light" ? "text-neutral-500" : "text-neutral-500"}`}>
                {language === "pt" ? "quantidade de vezes que cada versão toca por rodada (máximo 20)." : "each track version is repeated this many times before shuffling (maximum 20)."}
              </span>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase mb-2 flex items-center gap-1 ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "tabela principal (gatilho)" : "primary track pool (end trigger)"}
                <span className={`group relative cursor-pointer text-neutral-400 ${theme === "light" ? "hover:text-black" : "hover:text-white"}`}>
                  <HelpCircle className="w-4 h-4 inline" />
                  <span className={`hidden group-hover:block absolute bottom-6 right-0 border p-3 rounded text-xs w-64 shadow-xl leading-normal z-50 normal-case ${theme === "light" ? "bg-white border-neutral-200 text-neutral-800 shadow-2xl" : "bg-neutral-950 border-neutral-800 text-neutral-300 shadow-xl"}`}>
                    {language === "pt"
                      ? "A playlist encerra a geração assim que as músicas deste grupo selecionado acabarem."
                      : "The playlist generation terminates immediately when this chosen track pool runs out of tracks."}
                  </span>
                </span>
              </label>
              <select
                value={primaryTable}
                onChange={(e) => setPrimaryTable(parseInt(e.target.value))}
                className={`w-full border rounded px-3 py-2.5 text-sm focus:outline-none cursor-pointer font-serif ${theme === "light" ? "bg-white border-neutral-350 text-neutral-950 focus:border-black" : "bg-neutral-900 border-neutral-850 text-white focus:border-white"}`}
              >
                <option value={1}>{language === "pt" ? "tabela 1: música principal" : "focus track"}</option>
                <option value={2}>{language === "pt" ? "tabela 2: hits de apoio" : "supporting hits"}</option>
                <option value={3}>{language === "pt" ? "tabela 3: interlúdios" : "filler tracks"}</option>
                <option value={4}>{language === "pt" ? "tabela 4: músicas curtas" : "short tracks"}</option>
              </select>
            </div>

            <div className={`border-t pt-5 space-y-4 font-mono ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
              <span className={`block text-xs font-bold uppercase ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "quantidades por ciclo (máximo 2)" : "cycle quantities (per round - max 2)"}
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-450"}`}>{language === "pt" ? "música principal" : "focus tracks"}</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={focusQty}
                    onChange={(e) => setFocusQty(Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
                    className={`w-full border rounded p-2 text-sm text-center ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950" : "bg-neutral-900 border-neutral-850 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "hits de apoio" : "supporting hits"}</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={hitsQty}
                    onChange={(e) => setHitsQty(Math.max(0, Math.min(2, parseInt(e.target.value) || 0)))}
                    className={`w-full border rounded p-2 text-sm text-center ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950" : "bg-neutral-900 border-neutral-850 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "interlúdios" : "filler tracks"}</label>
                  <input
                    type="number"
                    min={1}
                    max={2}
                    value={fillersQty}
                    onChange={(e) => setFillersQty(Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
                    className={`w-full border rounded p-2 text-sm text-center ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950" : "bg-neutral-900 border-neutral-850 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "músicas curtas" : "short tracks"}</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={shortsQty}
                    onChange={(e) => setShortsQty(Math.max(0, Math.min(2, parseInt(e.target.value) || 0)))}
                    className={`w-full border rounded p-2 text-sm text-center ${theme === "light" ? "bg-white border-neutral-300 text-neutral-950" : "bg-neutral-900 border-neutral-850 text-white"}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateLocal}
            className={`w-full py-3.5 font-extrabold text-sm tracking-wider uppercase border transition-colors duration-200 cursor-pointer ${theme === "light" ? "bg-black hover:bg-neutral-800 text-white border-black" : "bg-white hover:bg-neutral-200 text-black border-white"}`}
          >
            {language === "pt" ? "gerar sequência" : "generate sequence"}
          </button>
        </div>
      </div>

      {/* Output Feedback Message */}
      {(errorMsg || successMsg) && (
        <div className={`p-4 border rounded text-sm font-mono ${errorMsg ? "bg-red-950/20 border-red-900/60 text-red-250" : (theme === "light" ? "bg-neutral-100 border-neutral-300 text-neutral-900" : "bg-wine-deep border-panel-border text-white")}`}>
          {errorMsg ? `${language === "pt" ? "erro: " : "error: "}${errorMsg}` : successMsg}
        </div>
      )}

      {/* Playlist Actions & Tracks Preview */}
      {generatedTracksList.length > 0 && (
        <div className={`border-t pt-6 space-y-6 ${theme === "light" ? "border-neutral-200" : "border-panel-border"}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className={`text-lg font-bold uppercase tracking-wider ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? `sequência gerada (${generatedTracksList.length} faixas)` : `generated playlist (${generatedTracksList.length} tracks)`}
              </h3>
              <p className={`text-xs mt-0.5 ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}>
                {language === "pt"
                  ? "a playlist está pronta! você pode copiar os links ou salvar diretamente na sua biblioteca do spotify."
                  : "the sequence is fully constructed. you can copy it or save it directly to your spotify account."}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleCopyToClipboard}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 border text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${theme === "light" ? "bg-black hover:bg-neutral-800 text-white border-black" : "bg-white hover:bg-neutral-200 text-black border-white"}`}
              >
                <Copy className="w-3.5 h-3.5" /> {language === "pt" ? "copiar links das faixas" : "copy track links"}
              </button>
            </div>
          </div>

          <div className={`text-xs font-serif leading-relaxed mt-2 p-4 border rounded ${theme === "light" ? "bg-neutral-50 border-neutral-250 text-neutral-600" : "bg-wine-deep/40 border-panel-border text-neutral-400"}`}>
            💡 {language === "pt"
              ? "copie os links das músicas e cole-os no campo de busca do spotify para montar a sua playlist rapidamente, ou adicione-os na fila na sequência listada."
              : "copy the track links and paste them into spotify's search bar to build your playlist, or manually queue them in this exact order."}
          </div>

          {/* Tracks preview list */}
          <div className={`border rounded max-h-80 overflow-y-auto font-mono text-[11px] p-3 divide-y ${theme === "light" ? "bg-white border-neutral-200 text-neutral-800 divide-neutral-100" : "bg-neutral-950 border-neutral-800 text-neutral-300 divide-neutral-900/80"}`}>
            {generatedTracksList.map((uri, idx) => {
              const id = uri.split(":track:")[1];
              return (
                <div key={idx} className="py-1.5 flex justify-between items-center gap-2">
                  <span className="text-neutral-500 font-mono">[{String(idx + 1).padStart(3, '0')}]</span>
                  <span className="truncate flex-1 font-mono">{uri}</span>
                  <a
                    href={`https://open.spotify.com/track/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[10px] underline uppercase keep-casing ${theme === "light" ? "text-neutral-600 hover:text-black" : "text-neutral-400 hover:text-white"}`}
                  >
                    open
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
