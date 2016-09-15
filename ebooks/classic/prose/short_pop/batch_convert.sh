for file in `find . -type f -name \*.htm\* -exec basename {} \;`; do
    #echo "iconv -f gb2312 -t utf-8 "$file" -o "tt34.html" && mv -f tt34.html $file"
    #myfile=$(basename $file)
    #echo "iconv -f gb2312 -t utf-8 "$file" -o "temp/$file""
    echo "enca -L chinese $file -x utf8"
    enca -L chinese $file -x utf8 || \
    ((iconv -f gb2312 -t utf-8 "$file" -o "utf8.$file" ||\
    iconv -f gbk -t utf-8 "$file" -o "utf8.$file" ||\
    iconv -f gb18030 -t utf-8 "$file" -o "utf8.$file"|| \
    iconv -f iso-8859-1 -t utf-8 "$file" -o "utf8.$file") && \
    mv -f utf8.$file $file)

    #iconv -f gbk -t utf-8 "$file" -o "temp/$file"
done
