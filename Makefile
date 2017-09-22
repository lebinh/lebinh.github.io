.PHONY: deploy

deploy:
	git add .
ifdef msg
	git commit -m '$(msg)'
else
	git commit -m 'site deploy'
	git push origin master
	cd ..
endif

