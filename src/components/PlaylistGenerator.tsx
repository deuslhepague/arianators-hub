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
import { Music, Settings, HelpCircle, Copy, Search, Trash2, Plus, RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

const getTrackIdFromUrl = (url: string): string => {
  try {
    const parts = url.split("/track/");
    if (parts.length > 1) {
      return parts[1].split("?")[0];
    }
    return url;
  } catch (e) {
    return url;
  }
};

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
    name: "hate that i made you love me",
    versions: [
      "https://open.spotify.com/track/20jbSiX29FDX4oQxBXyUEi",
      "https://open.spotify.com/track/3iy2QuCtCzpWnR6tia39AB",
      "https://open.spotify.com/track/2HhRoFkJ6ejaTQmKKrgmhe",
      "https://open.spotify.com/track/6flVfBnGgTLZBT1hAt1XfJ",
      "https://open.spotify.com/track/3sLsICFrhFhXZlRFb3f2jB",
      "https://open.spotify.com/track/3idrvUQYONMAJ6EgZZqiL8"
    ]
  },
  {
    id: "into-you",
    name: "into you",
    versions: [
      "https://open.spotify.com/track/63y6xWR4gXz7bnUGOk8iI6",
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
      "https://open.spotify.com/track/5kbzrk1p3d056KYOU41QDh",
      "https://open.spotify.com/track/4Bsd7hSLYvqaZFRyaWiw1E",
      "https://open.spotify.com/track/73u1ip4mDThhjg0I8AmR2V",
      "https://open.spotify.com/track/3AnwddQhBCSDUwlvbRGyDA",
      "https://open.spotify.com/track/1Oj6gVTwhWYXngPgU8oznO",
      "https://open.spotify.com/track/6y3bJ52O0Q0y1fWoda9vr6"
    ]
  },
  {
    id: "motive",
    name: "motive",
    versions: [
      "https://open.spotify.com/track/5GkQIP5mWPi4KZLLXeuFTT",
      "https://open.spotify.com/track/5VipERQ1ofCowecoFg2MVU",
      "https://open.spotify.com/track/3Hgk2MiY3hIIp6Hmf1fxeW",
      "https://open.spotify.com/track/0zB7iPxmJNRVfc4pWDlnq0"
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
      "https://open.spotify.com/track/2qT1uLXPVPzGgFOx4jtEuo",
      "https://open.spotify.com/track/4wZqeCVR3fwS5MFoRtAnia",
      "https://open.spotify.com/track/5SxkdsY1ufZzoq9iXceLw9",
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
      "https://open.spotify.com/track/1bj8x3ERN9gSc2NfJIpc76",
      "https://open.spotify.com/track/3RP1eXaK8f4rwqY9fRKVRF",
      "https://open.spotify.com/track/7mNsHed5BYlpmgFqAAkvsM"
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
    name: "thank u, next",
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
      "https://open.spotify.com/track/0S4RKPbRDA72tvKwVdXQqe",
      "https://open.spotify.com/track/5FhVKyPvQ2rnimFwNAxu2C",
      "https://open.spotify.com/track/3WJCkJPIOk2ltt12BHJWJY",
      "https://open.spotify.com/track/0onZ1TwmOAbLqWOXKhEvpF",
      "https://open.spotify.com/track/1Onx2O64wzyA7ZzOsBBqBJ",
      "https://open.spotify.com/track/3HAQ4fEd3opmo09LJIHOX2",
      "https://open.spotify.com/track/1NTof5FmyQo5YciNJtqtJM",
      "https://open.spotify.com/track/5Gbb5sEd2AcDFMaY60N3wu",
      "https://open.spotify.com/track/2n4y1jo4oUB6KTVWID8O9S",
      "https://open.spotify.com/track/52hpSaCHjkqoxE9Tpr2w0p",
      "https://open.spotify.com/track/0S4RKPbRDA72tvKwVdXQqe",
      "https://open.spotify.com/track/5FhVKyPvQ2rnimFwNAxu2C",
      "https://open.spotify.com/track/6csiA8EczbxAHDewDL7QQl",
      "https://open.spotify.com/track/0qdx5s2ryTmuRJeyIyNWWe",
      "https://open.spotify.com/track/6csiA8EczbxAHDewDL7QQl",
      "https://open.spotify.com/track/0qdx5s2ryTmuRJeyIyNWWe",
      "https://open.spotify.com/track/5G1sFEVDwB1dy1cFwQuEpT",
      "https://open.spotify.com/track/7iowREYA23mrLjv8bouwnp"
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
    ],
  },
  {
    id: "positions",
    name: "positions",
    versions: [
      "https://open.spotify.com/track/35mvY5S1H3J2QZyna3TFe0",
      "https://open.spotify.com/track/1eNoiSrvdNWZfCOrP37jSf",
      "https://open.spotify.com/track/7igeByaBM0MgGsgXtNxDJ7",
      "https://open.spotify.com/track/7wLK9PAeZMBDVKsm7ptOMn",
      "https://open.spotify.com/track/3DFnLXa69NVlOjbhTbXXNn",
      "https://open.spotify.com/track/0edCZS4cbBSFiVvVgBy5oc",
      "https://open.spotify.com/track/4fLUGNHcSrqPYydrIHyLB9",
      "https://open.spotify.com/track/0u4O4iyDncVzgyBqNeAwUv",
      "https://open.spotify.com/track/1xFVBG4B149leF5qj4kvof",
      "https://open.spotify.com/track/7qwQQD53UPHUxRtKplUgdt",
      "https://open.spotify.com/track/4sP9XNzr5YkiSx5GEgl7YZ",
      "https://open.spotify.com/track/5DvZAbmEQtxCjQ5HTufZzJ",
      "https://open.spotify.com/track/5x8kSO7nQxUQ9D5QY9SC8c",
      "https://open.spotify.com/track/7DH05XWXYYyvijw0ktX6Vj"
    ],
  },
  {
    id: "one-last-time",
    name: "one last time",
    versions: [
      "https://open.spotify.com/track/7xoUc6faLbCqZO6fQEYprd",
      "https://open.spotify.com/track/50rGbTr2wrWnlIelPQxi87",
      "https://open.spotify.com/track/7bJwvubZZaoGE1AGEfu8Fi",
      "https://open.spotify.com/track/1CAksvEO6oRHd9bBKWAfuY",
      "https://open.spotify.com/track/4Y8KhqNtOMToFdUOAJpECt",
      "https://open.spotify.com/track/7rsLMII8g2bqmJNvgNgLk7",
      "https://open.spotify.com/track/1SP0qh2iRe8tByUy3Y8Tx0",
      "https://open.spotify.com/track/3mbaod7ARSaS3fr5mOMkk1",
      "https://open.spotify.com/track/6iRvhzkX1XjeUcQr1ey1ZP",
      "https://open.spotify.com/track/0e6qFb4yA7MkyHA9Cpb6c1",
      "https://open.spotify.com/track/1043bXNgWDCWM2rhvieIh9",
      "https://open.spotify.com/track/792wdrg1YVhzdpLLy2rLeC"
    ]
  },
  {
    id: "problem",
    name: "problem",
    versions: [
      "https://open.spotify.com/track/7vS3Y0IKjde7Xg85LWIEdP",
      "https://open.spotify.com/track/5w048fMWMdqxT2UAyXXB1Z",
      "https://open.spotify.com/track/7fYbFYt7X4FZvuJJC90EX0",
      "https://open.spotify.com/track/7E8edqa0m0ASLXkLfmWY03",
      "https://open.spotify.com/track/6WMhHZ8DK94KXzJVMXzig5",
      "https://open.spotify.com/track/6DIJNt6nfvvlqn8zvNVEtu",
      "https://open.spotify.com/track/7Ao6LlHB0fQHAyMWSMs9zO",
      "https://open.spotify.com/track/0NCEyOzVW7FF5nL1MBecM7",
      "https://open.spotify.com/track/3cySlItpiPiIAzU3NyHCJf",
      "https://open.spotify.com/track/0NenBmcPtlaBGYAhU798G4",
      "https://open.spotify.com/track/6xCNYRfzZtoQRo1xruPmNq",
      "https://open.spotify.com/track/4jwPNgd0ux1wE4TgETVIT3",
      "https://open.spotify.com/track/1f9MXvV39Mrx2TAEx5M2TB",
      "https://open.spotify.com/track/075QrWReNxCc4Ubcqd2oqL",
      "https://open.spotify.com/track/65AaVEYJkgOkjfrI9geI5P"
    ]
  },
  {
    id: "santa-tell-me",
    name: "santa tell me",
    versions: [
      "https://open.spotify.com/track/0lizgQ7Qw35od7CYaoMBZb",
      "https://open.spotify.com/track/6V2JPFiAeqfZjM3A8VNr5q",
      "https://open.spotify.com/track/1ADjWm8QNhgNV8yCNNgQ1T",
      "https://open.spotify.com/track/6rSrX1te6gVYcHVXMGfcCQ",
      "https://open.spotify.com/track/6zqCoMa7k6wYD3OXJxAV5w",
      "https://open.spotify.com/track/0un8vLp0hSudAJNLjImTEE",
      "https://open.spotify.com/track/62AGBURrH2EsqA7yblCGXP",
      "https://open.spotify.com/track/0Tq23DcxKDVRojIU8Nq1r8",
      "https://open.spotify.com/track/0iQSsR3A5lbwU0V2C2uM4C",
      "https://open.spotify.com/track/2QqkMsF2nAbD30IXAwGXvV",
      "https://open.spotify.com/track/4RJZThhcGy5LP8ZXx3ulSr",
      "https://open.spotify.com/track/0vHDowYb85LDID5OuAvuz1",
      "https://open.spotify.com/track/5c97Z367MAY3ddnLr9o849",
      "https://open.spotify.com/track/0cItQNWv1FrJj19IPd2CAh",
      "https://open.spotify.com/track/17LfGE2Fi0LRfYyppMkWbF",
      "https://open.spotify.com/track/7KDbvrIytRaZmIE8KCj0Ul",
      "https://open.spotify.com/track/7Hw5WKhzMSvp26cxVLDWPI",
      "https://open.spotify.com/track/7jlJEjBTWzg8tvz2X7ZYKZ",
      "https://open.spotify.com/track/0F9mxLWu8a872V2wBwVCRv",
      "https://open.spotify.com/track/72RHiZSlEqtI9qIhKcTNZe",
      "https://open.spotify.com/track/6qGK9PQ4nS2NctDQ3Z8kvV",
      "https://open.spotify.com/track/5lSDpgeucP7d0uziC2tU3W",
      "https://open.spotify.com/track/1CR5uTc3FdIaoHCBlwYxj6",
      "https://open.spotify.com/track/0ibPkrkVYVPoJoQhiZr3J6",
      "https://open.spotify.com/track/4TLGxQKakWLFzDaTwCNFvN",
      "https://open.spotify.com/track/60hOUgTstkEfzcxyKXfkNQ",
      "https://open.spotify.com/track/4ylyqIgwXaA8Mnco1jYA83",
      "https://open.spotify.com/track/7KnXhjQSTiG78fhtXimCgh",
      "https://open.spotify.com/track/6McVc4s8LzJCqUjYxIsLuJ",
      "https://open.spotify.com/track/22aEKEl46zsfU3avxiSxHd",
      "https://open.spotify.com/track/3hy0j7oWJD1PIPmAamD7CJ",
      "https://open.spotify.com/track/1RC8hzjFjNh10dghi17j2E",
      "https://open.spotify.com/track/5wiEgTtkciYkZFivVDnYeo",
      "https://open.spotify.com/track/5DtLc4u1Aias7kdb1UXfTG",
      "https://open.spotify.com/track/0wslRYCORfo5bhhiOMBB6Y",
      "https://open.spotify.com/track/0OtF0EDmpCDjiY01D4cqyy",
      "https://open.spotify.com/track/7od71nKShaWUuGpQb9UASV",
      "https://open.spotify.com/track/1WwU0QHTqSYyvx5l8BZkFg",
      "https://open.spotify.com/track/2YCJGX8j5nXri6PlEDsxuu",
      "https://open.spotify.com/track/1NVVXX8Nf5ClHOhjAEA28i",
      "https://open.spotify.com/track/1QGRV86qSaQ5j9Hpcu6oYH",
      "https://open.spotify.com/track/4lzJbb04NAnTMcw2JaXBJF",
      "https://open.spotify.com/track/3J3ILk9ASvnRBmZAd9sfde",
      "https://open.spotify.com/track/1VMmdu45ncsu8vVKRt1W8s",
      "https://open.spotify.com/track/02hpL9qLNmAoW9jLJt3LHe",
      "https://open.spotify.com/track/0iEcx023v8qJd4Vj0ypGEZ",
      "https://open.spotify.com/track/5Grs7nejHVIqfArW2Po1Nx",
      "https://open.spotify.com/track/3amzEcjw25IPVYqN7DVyoL",
      "https://open.spotify.com/track/671uHEYKRR1e7k1FCxsdMf",
      "https://open.spotify.com/track/18rMyTaM76eX7rEbV0TJAJ",
      "https://open.spotify.com/track/1dysgzKAYZC47G7ytNoydn",
      "https://open.spotify.com/track/4y5uYNFhT5WEjK8YIAZXAp",
      "https://open.spotify.com/track/5EQeNKL3IO7sfWIXtTn1Gf",
      "https://open.spotify.com/track/2Df0XndUpzaMTzEnrVfoBz",
      "https://open.spotify.com/track/44PXmsdL4bSFFv54zU3AeD",
      "https://open.spotify.com/track/6BcCDA0MF98eJUXTB5L3f7",
      "https://open.spotify.com/track/4IVis2Ahz6TVi83jr8MyKL",
      "https://open.spotify.com/track/5A14kQgIeL9nOuK283iK3w",
      "https://open.spotify.com/track/78nun1pJFemLzDt8Tl2O5B",
      "https://open.spotify.com/track/5CX8vF2xpBFz6E23ILSnQ1"
    ]
  },
  {
    id: "love-me-harder",
    name: "love me harder",
    versions: [
      "https://open.spotify.com/track/5J4ZkQpzMUFojo1CtAZYpn",
      "https://open.spotify.com/track/3RknjKzaZkjBqIGEN1Q871",
      "https://open.spotify.com/track/1aKsg5b9sOngINaQXbB0P7",
      "https://open.spotify.com/track/2Pm40TLDw6G78thGOdsJW7",
      "https://open.spotify.com/track/45wBTYlOx3FsuFluuuRRQh",
      "https://open.spotify.com/track/0e5q6Z47J4oU5S0gvfjKpi",
      "https://open.spotify.com/track/0FsoAtabqinl5yi1o5vF1G",
      "https://open.spotify.com/track/7ffCshvfjMGGNm5mhIyOun",
      "https://open.spotify.com/track/4hAwnqT5tLxywuTipn3A51",
      "https://open.spotify.com/track/3XhZO6P0xUC1LUFLAueRaf",
      "https://open.spotify.com/track/7HE1FnMtSsRotzIAQPXpr5",
      "https://open.spotify.com/track/3Y47AdAfvzC0Go7JihsvxT",
      "https://open.spotify.com/track/0TmrhQAcZXeOwsLLZfNSy6",
      "https://open.spotify.com/track/7ugGN2cNJtdu10hAMH6ygQ"
    ]
  }
];

export default function PlaylistGenerator() {
  const { user, token, login } = useSpotify();
  const { language, t } = useLanguage();
  const { theme } = useTheme();

  // Helper to determine initial focus track ID
  const getInitialFocusId = (): string => {
    return DATABASE_HITS.some(hit => hit.id === "hate-that-i-made-you")
      ? "hate-that-i-made-you"
      : DATABASE_HITS[0]?.id || "";
  };

  // Selection states
  const [selectedFocusId, setSelectedFocusId] = useState<string>(getInitialFocusId);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>(() => {
    const initialFocus = getInitialFocusId();
    const defaults = ["everyday", "pov", "yes-and-", "the-boy-is-mine", "breathin"];
    return defaults.filter(id => id !== initialFocus);
  });
  // Tracks disabled versions for each supporting hit ID
  const [disabledHitVersions, setDisabledHitVersions] = useState<Record<string, string[]>>(() => {
    const initialFocus = getInitialFocusId();
    const defaults = ["everyday", "pov", "yes-and-", "the-boy-is-mine", "breathin"];
    const initialDisabled: Record<string, string[]> = {};

    defaults.forEach(id => {
      if (id !== initialFocus) {
        const hitDef = DATABASE_HITS.find(h => h.id === id);
        if (hitDef && hitDef.versions.length > 2) {
          // Disable all versions after the first 2 by default
          initialDisabled[id] = hitDef.versions.slice(2);
        }
      }
    });
    return initialDisabled;
  });

  const [expandedHits, setExpandedHits] = useState<Record<string, boolean>>({});

  const toggleHitVersion = (hitId: string, versionUrl: string) => {
    setDisabledHitVersions(prev => {
      const disabled = prev[hitId] || [];
      const updatedDisabled = disabled.includes(versionUrl)
        ? disabled.filter(url => url !== versionUrl)
        : [...disabled, versionUrl];
      return {
        ...prev,
        [hitId]: updatedDisabled
      };
    });
  };

  const toggleHitExpansion = (hitId: string) => {
    setExpandedHits(prev => ({
      ...prev,
      [hitId]: !prev[hitId]
    }));
  };

  const handleHitCountChange = (hitId: string, hitDef: HitTrackDefinition, newCount: number) => {
    const count = Math.max(1, Math.min(hitDef.versions.length, newCount));
    const disabled = hitDef.versions.slice(count);
    setDisabledHitVersions(prev => ({
      ...prev,
      [hitId]: disabled
    }));
  };

  const [hitSearchQuery, setHitSearchQuery] = useState<string>("");

  // Tracks disabled versions for each focus track ID
  const [disabledFocusVersions, setDisabledFocusVersions] = useState<Record<string, string[]>>({});

  const toggleFocusVersion = (versionUrl: string) => {
    setDisabledFocusVersions(prev => {
      const disabled = prev[selectedFocusId] || [];
      const updatedDisabled = disabled.includes(versionUrl)
        ? disabled.filter(url => url !== versionUrl)
        : [...disabled, versionUrl];
      return {
        ...prev,
        [selectedFocusId]: updatedDisabled
      };
    });
  };

  const getFocusTrackVersions = (): string[] => {
    const disabled = disabledFocusVersions[selectedFocusId] || [];
    return activeFocusTrack.versions.filter(version => !disabled.includes(version));
  };

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

  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const storedFocusId = localStorage.getItem("arianator_active_focus_track_id");
      if (storedFocusId && DATABASE_HITS.some(hit => hit.id === storedFocusId)) {
        setSelectedFocusId(storedFocusId);
      }

      const storedHitIds = localStorage.getItem("arianator_selected_hit_ids");
      if (storedHitIds) setSelectedHitIds(JSON.parse(storedHitIds));

      const storedDisabledHits = localStorage.getItem("arianator_disabled_hit_versions");
      if (storedDisabledHits) setDisabledHitVersions(JSON.parse(storedDisabledHits));

      const storedDisabledFocus = localStorage.getItem("arianator_disabled_focus_versions");
      if (storedDisabledFocus) setDisabledFocusVersions(JSON.parse(storedDisabledFocus));

      const storedRepetitions = localStorage.getItem("arianator_repetitions");
      if (storedRepetitions) setRepetitions(Number(JSON.parse(storedRepetitions)));

      const storedFocusQty = localStorage.getItem("arianator_focus_qty");
      if (storedFocusQty) setFocusQty(Number(JSON.parse(storedFocusQty)));

      const storedHitsQty = localStorage.getItem("arianator_hits_qty");
      if (storedHitsQty) setHitsQty(Number(JSON.parse(storedHitsQty)));

      const storedFillersQty = localStorage.getItem("arianator_fillers_qty");
      if (storedFillersQty) setFillersQty(Number(JSON.parse(storedFillersQty)));

      const storedShortsQty = localStorage.getItem("arianator_shorts_qty");
      if (storedShortsQty) setShortsQty(Number(JSON.parse(storedShortsQty)));

      const storedPrimaryTable = localStorage.getItem("arianator_primary_table");
      if (storedPrimaryTable) setPrimaryTable(Number(JSON.parse(storedPrimaryTable)));

      const storedPlaylistName = localStorage.getItem("arianator_playlist_name");
      if (storedPlaylistName) setPlaylistName(JSON.parse(storedPlaylistName));

      const storedPlaylistDesc = localStorage.getItem("arianator_playlist_desc");
      if (storedPlaylistDesc) setPlaylistDesc(JSON.parse(storedPlaylistDesc));

      const storedGeneratedTracks = localStorage.getItem("arianator_generated_tracks_list");
      if (storedGeneratedTracks) setGeneratedTracksList(JSON.parse(storedGeneratedTracks));

      const storedGeneratedUrl = localStorage.getItem("arianator_generated_url");
      if (storedGeneratedUrl) setGeneratedUrl(JSON.parse(storedGeneratedUrl));

    } catch (e) {
      console.error("Error loading state from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage when changes occur (only after load is completed)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("arianator_active_focus_track_id", selectedFocusId);
      localStorage.setItem("arianator_selected_hit_ids", JSON.stringify(selectedHitIds));
      localStorage.setItem("arianator_disabled_hit_versions", JSON.stringify(disabledHitVersions));
      localStorage.setItem("arianator_disabled_focus_versions", JSON.stringify(disabledFocusVersions));
      localStorage.setItem("arianator_repetitions", JSON.stringify(repetitions));
      localStorage.setItem("arianator_focus_qty", JSON.stringify(focusQty));
      localStorage.setItem("arianator_hits_qty", JSON.stringify(hitsQty));
      localStorage.setItem("arianator_fillers_qty", JSON.stringify(fillersQty));
      localStorage.setItem("arianator_shorts_qty", JSON.stringify(shortsQty));
      localStorage.setItem("arianator_primary_table", JSON.stringify(primaryTable));
      localStorage.setItem("arianator_playlist_name", JSON.stringify(playlistName));
      localStorage.setItem("arianator_playlist_desc", JSON.stringify(playlistDesc));
      localStorage.setItem("arianator_generated_tracks_list", JSON.stringify(generatedTracksList));
      localStorage.setItem("arianator_generated_url", JSON.stringify(generatedUrl));
    } catch (e) {
      console.error("Error writing to localStorage", e);
    }
  }, [
    isLoaded,
    selectedFocusId,
    selectedHitIds,
    disabledHitVersions,
    disabledFocusVersions,
    repetitions,
    focusQty,
    hitsQty,
    fillersQty,
    shortsQty,
    primaryTable,
    playlistName,
    playlistDesc,
    generatedTracksList,
    generatedUrl
  ]);

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
      setDisabledHitVersions(prev => {
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
      if (hitDef && hitDef.versions.length > 2) {
        setDisabledHitVersions(prev => ({
          ...prev,
          [id]: hitDef.versions.slice(2)
        }));
      }
    }
    setHitSearchQuery("");
  };

  const removeHit = (id: string) => {
    setSelectedHitIds(prev => prev.filter(item => item !== id));
    setDisabledHitVersions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setExpandedHits(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const moveHit = (index: number, direction: "left" | "right") => {
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= selectedHitIds.length) return;

    setSelectedHitIds(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[nextIndex];
      copy[nextIndex] = temp;
      return copy;
    });
  };

  const getTabela2Tracks = (): string[] => {
    return selectedHitIds
      .map(id => DATABASE_HITS.find(h => h.id === id))
      .filter((h): h is HitTrackDefinition => !!h)
      .flatMap(h => {
        const disabled = disabledHitVersions[h.id] || [];
        return h.versions.filter(version => !disabled.includes(version));
      });
  };

  const generateLocalSequence = (): string[] => {
    const config: PlaylistConfig = {
      tabela1: getFocusTrackVersions(),
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
      if (focusQty > 0 && getFocusTrackVersions().length === 0) {
        throw new Error(
          language === "pt"
            ? "selecione ao menos uma versão da música foco ou defina a quantidade de música principal para 0."
            : "select at least one version of the focus track or set focus tracks qty to 0."
        );
      }
      if (hitsQty > 0) {
        for (const hitId of selectedHitIds) {
          const hitDef = DATABASE_HITS.find(h => h.id === hitId);
          if (hitDef) {
            const disabled = disabledHitVersions[hitId] || [];
            if (disabled.length === hitDef.versions.length) {
              throw new Error(
                language === "pt"
                  ? `selecione ao menos uma versão para o hit "${hitDef.name}" ou remova-o.`
                  : `select at least one version for the hit "${hitDef.name}" or remove it.`
              );
            }
          }
        }
      }
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
    <section className="neobrutal-card p-6 lg:p-10 space-y-8 animate-fade-in text-floral-fg" id="generator">
      <div className="flex items-center gap-4 border-b-2 border-foreground pb-6">
        <div className={`p-3 rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--foreground)] ${theme === "light" ? "bg-neutral-100 text-black" : "bg-neutral-900 text-white"}`}>
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
          <div className="neobrutal-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold uppercase tracking-wider ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "tabela 1: música foco" : "1. focus track"}
              </h3>
              <span className={`text-xs font-mono ${theme === "light" ? "text-neutral-500" : "text-neutral-400"}`}>
                {language === "pt" ? "meta activa" : "active target"}
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
              className={`w-full border-2 border-foreground rounded-none px-3 py-3 text-base focus:outline-none cursor-pointer font-serif ${theme === "light" ? "bg-white text-neutral-950 focus:border-black" : "bg-neutral-950 text-white focus:border-white"}`}
            >
              {[...DATABASE_HITS]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.versions.length} {language === "pt" ? "versões" : "versions"})
                  </option>
                ))}
            </select>

            <div className="space-y-2">
              <span className={`block text-xs font-bold uppercase ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "selecione as versões a serem rotacionadas:" : "select versions to rotate:"}
              </span>
              <div className={`text-xs space-y-2 p-4 border-2 border-foreground rounded-none font-mono max-h-48 overflow-y-auto ${theme === "light" ? "bg-neutral-50 text-neutral-600" : "bg-neutral-950/60 text-neutral-400"}`}>
                {activeFocusTrack.versions.map((url, i) => {
                  const isChecked = !(disabledFocusVersions[selectedFocusId] || []).includes(url);
                  return (
                    <label key={i} className="flex items-center gap-3 cursor-pointer select-none py-1 hover:opacity-80 transition-opacity">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFocusVersion(url)}
                        className={`w-4 h-4 border-2 border-foreground rounded-none accent-foreground cursor-pointer focus:ring-0 ${theme === "light" ? "bg-white text-black" : "bg-neutral-950 text-white"}`}
                      />
                      <span className="truncate flex-1">
                        <span className="font-bold mr-1">{i + 1}:</span>
                        {getTrackIdFromUrl(url)}
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`hover:opacity-75 ${theme === "light" ? "text-neutral-600" : "text-neutral-400"}`}
                        title={language === "pt" ? "abrir no spotify" : "open in spotify"}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. SUPPORTING HITS LIST & SEARCH */}
          <div className="neobrutal-card p-6 space-y-6">
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
                className={`w-full pl-10 pr-4 py-2.5 border-2 border-foreground rounded-none text-sm focus:outline-none font-serif ${theme === "light" ? "bg-white text-neutral-950 placeholder-neutral-500" : "bg-neutral-950 text-white placeholder-neutral-400"}`}
              />

              {/* Search dropdown results */}
              {searchResults.length > 0 && (
                <div className={`absolute left-0 right-0 mt-2 border-2 border-foreground rounded-none shadow-2xl max-h-48 overflow-y-auto z-30 divide-y-2 divide-foreground ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"}`}>
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
                <div className="text-center py-6 border-2 border-dashed border-foreground rounded-none text-sm bg-wine-deep/10">
                  {language === "pt"
                    ? "nenhum hit de apoio selecionado. busque e adicione acima."
                    : "no supporting hits selected. search and add some above."}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {selectedHitIds.map((hitId, idx) => {
                    const hitDef = DATABASE_HITS.find(h => h.id === hitId);
                    if (!hitDef) return null;
                    const disabled = disabledHitVersions[hitId] || [];
                    const activeCount = hitDef.versions.length - disabled.length;
                    const isExpanded = !!expandedHits[hitId];
                    return (
                      <div
                        key={hitId}
                        className={`relative flex items-center gap-3 px-3 py-1.5 border-2 border-foreground rounded-none text-xs font-semibold font-mono shadow-[2px_2px_0px_0px_var(--foreground)] ${theme === "light" ? "bg-neutral-100 text-neutral-850" : "bg-neutral-900 text-white"}`}
                      >
                        <span className="truncate max-w-[150px] sm:max-w-[200px]" title={hitDef.name}>
                          {hitDef.name}
                        </span>

                        <div className="flex items-center gap-1 border-l pl-2 border-foreground">
                          <span className="text-[10px] uppercase font-bold text-neutral-500">
                            {language === "pt" ? "versões:" : "versions:"}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={hitDef.versions.length}
                            value={activeCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              handleHitCountChange(hitId, hitDef, val);
                            }}
                            className={`w-10 text-center rounded-none border-2 border-foreground focus:outline-none font-mono text-xs ${theme === "light"
                              ? "bg-white text-black"
                              : "bg-neutral-950 text-white"
                              }`}
                          />
                          <span className="text-[10px] text-neutral-500">
                            / {hitDef.versions.length}
                          </span>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5 border-l pl-2 border-foreground">
                          <button
                            onClick={() => moveHit(idx, "left")}
                            disabled={idx === 0}
                            className={`transition-colors cursor-pointer p-0.5 rounded border border-transparent enabled:hover:border-foreground disabled:opacity-30 ${theme === "light" ? "text-neutral-500 enabled:hover:text-black" : "text-neutral-400 enabled:hover:text-white"}`}
                            title={language === "pt" ? "mover para a esquerda" : "move left"}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveHit(idx, "right")}
                            disabled={idx === selectedHitIds.length - 1}
                            className={`transition-colors cursor-pointer p-0.5 rounded border border-transparent enabled:hover:border-foreground disabled:opacity-30 ${theme === "light" ? "text-neutral-500 enabled:hover:text-black" : "text-neutral-400 enabled:hover:text-white"}`}
                            title={language === "pt" ? "mover para a direita" : "move right"}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dropdown Toggle Button */}
                        <button
                          onClick={() => toggleHitExpansion(hitId)}
                          className={`transition-colors cursor-pointer p-0.5 rounded border border-transparent hover:border-foreground ${theme === "light" ? "text-neutral-500 hover:text-black" : "text-neutral-400 hover:text-white"}`}
                          title={language === "pt" ? "seleção manual" : "manual selection"}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => removeHit(hitId)}
                          className={`transition-colors cursor-pointer ml-1 p-0.5 rounded ${theme === "light" ? "text-neutral-400 hover:text-black" : "text-neutral-500 hover:text-white"}`}
                          title="remove track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Absolute Manual Selection Dropdown */}
                        {isExpanded && (
                          <div
                            className={`absolute top-full left-0 mt-1.5 border-2 border-foreground z-40 p-3 space-y-2 max-h-48 overflow-y-auto w-64 shadow-[3px_3px_0px_0px_var(--foreground)] ${theme === "light" ? "bg-white text-neutral-800" : "bg-neutral-950 text-neutral-200"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-bold text-[9px] uppercase border-b border-foreground pb-1 flex justify-between items-center select-none">
                              <span>{language === "pt" ? "seleção manual:" : "manual selection:"}</span>
                              <button
                                onClick={() => toggleHitExpansion(hitId)}
                                className="underline hover:opacity-85 cursor-pointer text-[9px]"
                              >
                                {language === "pt" ? "fechar" : "close"}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {hitDef.versions.map((url, i) => {
                                const isChecked = !disabled.includes(url);
                                return (
                                  <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:opacity-85 transition-opacity font-mono text-[9px]">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleHitVersion(hitId, url)}
                                      className={`w-3.5 h-3.5 border border-foreground rounded-none accent-foreground cursor-pointer focus:ring-0 ${theme === "light" ? "bg-white text-black" : "bg-neutral-950 text-white"}`}
                                    />
                                    <span className="truncate flex-1">
                                      <span className="font-bold mr-1">{i + 1}:</span>
                                      {getTrackIdFromUrl(url)}
                                    </span>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className={`hover:opacity-75 ${theme === "light" ? "text-neutral-500" : "text-neutral-400"}`}
                                      title={language === "pt" ? "abrir no spotify" : "open in spotify"}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-xs pt-4 border-t-2 border-foreground flex justify-between font-mono">
              <span>{language === "pt" ? "músicas de apoio no mix:" : "supporting tracks loaded in mix:"}</span>
              <span className={`font-bold ${theme === "light" ? "text-neutral-950" : "text-white"}`}>{getTabela2Tracks().length} slots</span>
            </div>
          </div>

          {/* 3. FILLERS & SHORTS DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-foreground p-5 shadow-[2px_2px_0px_0px_var(--foreground)] rounded-none">
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
                {language === "pt" ? "tabela 3: interlúdios (fillers)" : "3. filler tracks"}
              </h3>
              <p className={`text-xs leading-relaxed font-mono ${theme === "light" ? "text-neutral-600" : "text-neutral-450"}`}>
                {language === "pt"
                  ? `utiliza ${DEFAULT_FILLER_TRACKS.length} interlúdios de outros artistas para otimizar streams.`
                  : `utilizes ${DEFAULT_FILLER_TRACKS.length} non-ariana interludes to optimize streams.`}
              </p>
            </div>
            <div className="border-2 border-foreground p-5 shadow-[2px_2px_0px_0px_var(--foreground)] rounded-none">
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
        <div className="neobrutal-card p-6 space-y-6">
          <h3 className={`text-base font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 border-foreground pb-4 ${theme === "light" ? "text-neutral-950" : "text-white"}`}>
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
                className={`w-full border-2 border-foreground rounded-none px-3 py-2.5 text-sm focus:outline-none ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-900 text-white"}`}
              />
              <span className={`text-xs mt-1 block ${theme === "light" ? "text-neutral-500" : "text-neutral-550"}`}>
                {language === "pt" ? "quantidade de vezes que cada versão toca por rodada (máximo 20)." : "each track version is repeated this many times before shuffling (maximum 20)."}
              </span>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase mb-2 flex items-center gap-1 ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "tabela principal (gatilho)" : "primary track pool (end trigger)"}
                <span className={`group relative cursor-pointer text-neutral-500 ${theme === "light" ? "hover:text-black" : "hover:text-white"}`}>
                  <HelpCircle className="w-4 h-4 inline" />
                  <span className={`hidden group-hover:block absolute bottom-6 right-0 border-2 border-foreground p-3 rounded-none text-xs w-64 shadow-[3px_3px_0px_0px_var(--foreground)] leading-normal z-50 normal-case ${theme === "light" ? "bg-white text-neutral-800" : "bg-neutral-950 text-neutral-350"}`}>
                    {language === "pt"
                      ? "A playlist encerra a geração assim que as músicas deste grupo selecionado acabarem."
                      : "The playlist generation terminates immediately when this chosen track pool runs out of tracks."}
                  </span>
                </span>
              </label>
              <select
                value={primaryTable}
                onChange={(e) => setPrimaryTable(parseInt(e.target.value))}
                className={`w-full border-2 border-foreground rounded-none px-3 py-2.5 text-sm focus:outline-none cursor-pointer font-serif ${theme === "light" ? "bg-white text-neutral-950 focus:border-black" : "bg-neutral-950 text-white focus:border-white"}`}
              >
                <option value={1}>{language === "pt" ? "tabela 1: música principal" : "focus track"}</option>
                <option value={2}>{language === "pt" ? "tabela 2: hits de apoio" : "supporting hits"}</option>
                <option value={3}>{language === "pt" ? "tabela 3: interlúdios" : "filler tracks"}</option>
                <option value={4}>{language === "pt" ? "tabela 4: músicas curtas" : "short tracks"}</option>
              </select>
            </div>

            <div className="border-t-2 border-foreground pt-5 space-y-4 font-mono">
              <span className={`block text-xs font-bold uppercase ${theme === "light" ? "text-neutral-700" : "text-neutral-300"}`}>
                {language === "pt" ? "quantidades por ciclo (ideal: 1-2)" : "cycle quantities (per round - ideal: 1-2)"}
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-450"}`}>{language === "pt" ? "música principal" : "focus tracks"}</label>
                  <input
                    type="number"
                    min={0}
                    value={focusQty}
                    onChange={(e) => setFocusQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full border-2 border-foreground rounded-none p-2 text-sm text-center ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-900 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "hits de apoio" : "supporting hits"}</label>
                  <input
                    type="number"
                    min={0}
                    value={hitsQty}
                    onChange={(e) => setHitsQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full border-2 border-foreground rounded-none p-2 text-sm text-center ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-900 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "interlúdios" : "filler tracks"}</label>
                  <input
                    type="number"
                    min={0}
                    value={fillersQty}
                    onChange={(e) => setFillersQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full border-2 border-foreground rounded-none p-2 text-sm text-center ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-900 text-white"}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${theme === "light" ? "text-neutral-500" : "text-neutral-455"}`}>{language === "pt" ? "músicas curtas" : "short tracks"}</label>
                  <input
                    type="number"
                    min={0}
                    value={shortsQty}
                    onChange={(e) => setShortsQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full border-2 border-foreground rounded-none p-2 text-sm text-center ${theme === "light" ? "bg-white text-neutral-950" : "bg-neutral-900 text-white"}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateLocal}
            className="w-full py-3.5 neobrutal-btn font-extrabold text-sm tracking-wider uppercase cursor-pointer"
          >
            {language === "pt" ? "gerar sequência" : "generate sequence"}
          </button>
        </div>
      </div>

      {/* Output Feedback Message */}
      {(errorMsg || successMsg) && (
        <div className={`p-4 border-2 border-foreground rounded-none text-sm font-mono shadow-[2px_2px_0px_0px_var(--foreground)] ${errorMsg ? "bg-red-950/20 text-red-400" : (theme === "light" ? "bg-neutral-100 text-neutral-900" : "bg-wine-deep text-white")}`}>
          {errorMsg ? `${language === "pt" ? "erro: " : "error: "}${errorMsg}` : successMsg}
        </div>
      )}

      {/* Playlist Actions & Tracks Preview */}
      {generatedTracksList.length > 0 && (
        <div className="border-t-2 border-foreground pt-6 space-y-6">
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
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 neobrutal-btn text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> {language === "pt" ? "copiar links das faixas" : "copy track links"}
              </button>
            </div>
          </div>

          <div className="text-xs font-serif leading-relaxed mt-2 p-4 border-2 border-foreground rounded-none bg-wine-deep/40 text-neutral-450 shadow-[2px_2px_0px_0px_var(--foreground)]">
            💡 {language === "pt"
              ? "copie os links das faixas e cole-os diretamente dentro de uma playlist no aplicativo do Spotify para Desktop para montá-la instantaneamente."
              : "copy the track links and paste them directly into a playlist inside the Spotify Desktop app to build it instantly."}
          </div>

          {/* Tracks preview list */}
          <div className={`border-2 border-foreground rounded-none max-h-80 overflow-y-auto font-mono text-[11px] p-3 divide-y-2 divide-foreground shadow-[2px_2px_0px_0px_var(--foreground)] ${theme === "light" ? "bg-white text-neutral-800" : "bg-neutral-950 text-neutral-350"}`}>
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
