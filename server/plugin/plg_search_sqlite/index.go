package plg_search_example

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.SearchEngine(SqliteSearch{})
}

type SqliteSearch struct{}

func (this SqliteSearch) Query(app App, path string, keyword string) ([]IFile, error) {
	files := []IFile{}
	if (keyword == "test13") {
		files = append(files, File{
			FName: "keyword-" + keyword + ".txt",
			FType: "file", // ENUM("file", "directory")
			FSize: 42,
			FPath: "/fullpath/keyword-" + keyword + ".txt",
		})
	}
	return files, nil
}
