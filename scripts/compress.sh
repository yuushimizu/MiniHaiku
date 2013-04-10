#jsmin < hatena-haiku-org.js > hatena-haiku.js
java -jar ~/bin/closure-compiler/compiler.jar --compilation_level=SIMPLE_OPTIMIZATIONS --js hatena-haiku-org.js --js_output_file hatena-haiku.js
if [ $? -eq 0 ]; then
    gzip -c hatena-haiku.js > hatena-haiku.gz.js;
fi
