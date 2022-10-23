import { faker } from "@faker-js/faker";
import { writeFile, mkdir } from "fs/promises";
import { resolve } from "path";

const configPath = resolve(__dirname, "../../config");

console.log("Generating random data...");

mkdir(configPath, {recursive: true})
  .then(() => {
    const array:string[] = [];
    for(let i=0; i<10;i++)
      array.push(faker.name.fullName())
    writeFile(resolve(configPath, "candidates.json"), JSON.stringify(array));
  })
  .then(() => {
    console.log("Successfully generated random data!");
  })
  .catch(error => {
    if(error instanceof Error)
      throw error;
    else if (typeof error === "string")
      throw new Error(error);
    else
      console.error(error);
  });