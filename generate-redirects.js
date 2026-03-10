const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const POSTS_DIR = path.join(__dirname, "src/content/posts");
const ARCHIVE_DIR = path.join(__dirname, "src/content/archive");

function generateRedirects(directory, destination) {
  const files = fs.readdirSync(directory);
  const redirects = [];

  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;

    const filePath = path.join(directory, filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);

    if (!data.permalink) continue;

    // "/sub-dao-culture/" → "sub-dao-culture"
    const slug = data.permalink.replace(/^\//, "").replace(/\/$/, "");
    const targetPath = `/${destination}/${slug}`;

    redirects.push({
      source: data.permalink,
      destination: targetPath,
      permanent: true,
    });

    // Also handle version without trailing slash if permalink has it
    if (data.permalink.endsWith("/")) {
      const withoutTrailing = data.permalink.slice(0, -1);
      redirects.push({
        source: withoutTrailing,
        destination: targetPath,
        permanent: true,
      });
    }
  }

  return redirects;
}

const postsRedirects = generateRedirects(POSTS_DIR, "posts");
const archiveRedirects = generateRedirects(ARCHIVE_DIR, "archive");

console.log("// Generated redirects for blog posts");
console.log("// Add these to next.config.ts → async redirects()");
console.log("");
console.log("const blogRedirects = [");

[...postsRedirects, ...archiveRedirects].forEach((redirect) => {
  console.log(`  {`);
  console.log(`    source: "${redirect.source}",`);
  console.log(`    destination: "${redirect.destination}",`);
  console.log(`    permanent: true,`);
  console.log(`  },`);
});

console.log("];");
console.log("");
console.log(`// Total: ${postsRedirects.length + archiveRedirects.length} redirects`);
console.log(`// Posts: ${postsRedirects.length} | Archive: ${archiveRedirects.length}`);
