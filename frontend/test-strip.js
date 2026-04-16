import strip from 'strip-comments';
const code = `
const a = 1; // test
/* block */
function() {
  return (
    <div>
      {/* jsx comment */}
    </div>
  )
}
`;
console.log(strip(code));
